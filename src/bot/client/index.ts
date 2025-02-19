import { DatabaseSession } from "#bot/types/client";
import { CronFunc } from "#bot/types/cron";
import { BaileysEventList, EventHandlerFunc, WSHandlerFunc } from "#bot/types/events";
import { useDatabaseAuthState } from "#bot/utils/session/manager";
import { postgresDb } from "@/database/client";
import { FileLogger } from "@/utils/logger/file";
import { sleep } from "@/utils/sleep";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  BaileysEventMap,
  BinaryNode,
  Browsers,
  ConnectionState,
  DisconnectReason,
  proto,
  WASocket,
} from "@whiskeysockets/baileys";
import { CronJob } from "cron";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import NodeCache from "node-cache";
import { EventEmitter } from "node:events";
import Pino from "pino";
import { runtimeLogger } from "..";

const Logger = Pino(
  {
    timestamp() {
      return `,"time":"${new Date().toJSON()}"`;
    },
  },
  Pino.destination(`./logs/baileys-${Date.now()}.log`)
);
const logger = Logger.child({});
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

export class Client extends EventEmitter {
  /**
   * @constructor
   */
  constructor(sessionName: string, private maxReconnectFails: number = 5, public runtimeLogger: FileLogger) {
    super();
    this.runtimeLogger.verbose("src > client > Client > constructor called!");
    runtimeLogger.info("Initializing client");
    runtimeLogger.verbose(`Client sessionName: ${sessionName}`);

    this.sessionName = sessionName;
    this.reconnectFail = 0;
    this.logger = logger;
    this.caches = {};

    runtimeLogger.verbose("Client class constructored!");
  }

  public sessionName: string;
  public socket?: WASocket;
  public session?: DatabaseSession;
  public logger: typeof Logger;
  public caches: Record<string, any>;
  public isEventSuspended: boolean = false;
  public suspendedEvents: [BaileysEventList, BaileysEventMap[BaileysEventList]][] = [];

  reconnectFail: number;

  #handlers: Set<{
    event: BaileysEventList;
    func: EventHandlerFunc<BaileysEventList>;
  }> = new Set();
  #wsHandlers: Set<{ event: string; func: WSHandlerFunc }> = new Set();
  #crons: Set<{ name: string; cronTime: string | Date; func: CronFunc }> = new Set();

  /**
   * Add event handler.
   * @param {BaileysEventList} event Listener baileys name
   * @param {EventHandlerFunc} func Listener function
   * @return {Client}
   */
  addEventHandler<T extends BaileysEventList>(event: T, func: EventHandlerFunc<T>): Client {
    this.runtimeLogger.verbose("src > client > Client > addEventHandler called!");
    this.#handlers.add({
      event,
      func: func as EventHandlerFunc<BaileysEventList>,
    });
    return this;
  }

  /**
   * Add websocket event handler.
   *
   * Useful for custom event handling
   * @param {BaileysEventList} event Listener baileys name
   * @param {EventHandlerFunc} func Listener function
   * @return {Client}
   */
  addWSHandler(event: string, func: WSHandlerFunc): Client {
    this.runtimeLogger.verbose("src > client > Client > addWSHandler called!");
    this.#wsHandlers.add({
      event,
      func,
    });
    return this;
  }

  /**
   * Wait for another connection
   * @return {void}
   */
  async wait(): Promise<void> {
    this.runtimeLogger.verbose("src > client > Client > wait called!");
    this.reconnectFail++;
    this.runtimeLogger.verbose(`Increasing reconnectFail to ${this.reconnectFail}`);

    if (this.reconnectFail >= this.maxReconnectFails) {
      // Crash the program to save memory usage >:(
      console.error(`Max reconnect fails reached! Exiting...`);
      this.runtimeLogger.error("Max reconnect fails reached! Exiting");
      process.exit();
    }

    this.runtimeLogger.verbose("Sleeping for 3000 ms");
    await sleep(3000);
    return;
  }

  addCron(name: string, cronTime: string | Date, func: CronFunc): Client {
    this.runtimeLogger.verbose("src > client > Client > addCron called!");
    this.#crons.add({ name, cronTime, func });
    return this;
  }

  /**
   * Default function handler fpr "connection.update"
   * @param ev Event object
   * @param removeCreds Function to remove the credentials when loggedOut
   */
  async updateConnection(ev: Partial<ConnectionState>, removeCreds: () => Promise<void>) {
    this.runtimeLogger.verbose("src > client > Client > updateConnection called!");
    const { lastDisconnect, connection } = ev;
    const reason = new Boom(lastDisconnect?.error).output.statusCode;
    this.runtimeLogger.verbose(`Got reason: ${reason}`);

    if (connection === "close") {
      this.runtimeLogger.warning('Connection to server state is "close"!');
      if (reason === DisconnectReason.badSession) {
        this.runtimeLogger.error("Bad session, please delete your session from database!");
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        await this.wait();
        this.runtimeLogger.warning("Connection closed, reconnecting");
        await this.launch();
      } else if (reason === DisconnectReason.connectionLost) {
        await this.wait();
        this.runtimeLogger.warning("Connection lost from server, reconnecting");
        await this.launch();
      } else if (reason === DisconnectReason.connectionReplaced) {
        this.runtimeLogger.error("Another session opened! Exiting");
        logger.error("Connection Replaced, Another New Session Opened, Please Close Current Session First");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        this.runtimeLogger.error("Device logged out, procees to delete your credentials!");
        await removeCreds();
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        this.runtimeLogger.info("Restart is required, restarting");
        await this.launch();
      } else if (reason === DisconnectReason.timedOut) {
        await this.wait();
        this.runtimeLogger.warning("Connection timed out, reconnecting");
        await this.launch();
      } else {
        this.runtimeLogger.warning(`Unknown disconnect reason: ${reason}: ${connection}`);
        logger.warn(`Unknown DisconnectReason: ${reason}: ${connection}`);
        await this.launch();
      }
    } else if (connection === "open") {
      this.runtimeLogger.info("Connection opened!");
      logger.info("Connection opened.");
    }
  }

  setEventSuspendedState(state: boolean) {
    this.runtimeLogger.verbose("Event suspension state changed to: " + String(state));
    if (state) {
      this.isEventSuspended = true;
    } else {
      this.isEventSuspended = false;

      this.runtimeLogger.verbose(`Emitting all ${this.suspendedEvents.length} event`);
      for (let i = 0; i < this.suspendedEvents.length; i++) {
        if (this.isEventSuspended) {
          // Maybe this will happen? Who knows
          this.runtimeLogger.verbose("ITS HAPPENING!");
          break;
        }

        const [eventName, event] = this.suspendedEvents[i];
        this.suspendedEvents.shift();
        this.runtimeLogger.verbose(`Emitting event: ${eventName}`);
        this.emit(eventName, event);
      }
    }
  }

  /**
   * Launch client
   * @returns {Promise<void>}
   */
  async launch(): Promise<void> {
    const client = this;

    this.runtimeLogger.verbose("src > client > Client > launch called!");
    this.runtimeLogger.verbose("Initializing database auth and WA Socket");
    this.session = await useDatabaseAuthState(this.sessionName);
    this.socket = makeWASocket({
      auth: this.session.state,
      logger: this.logger,
      printQRInTerminal: true,
      generateHighQualityLinkPreview: true,
      msgRetryCounterCache,
      browser: Browsers.windows("Edge"),
      async cachedGroupMetadata(jid) {
        const found = await postgresDb
          .selectFrom("group as g")
          .select((eb) => [
            "g.remote_jid as id",
            "g.owner",
            "g.subject",
            jsonArrayFrom(
              eb
                .selectFrom("participant as p")
                .leftJoin("contact as c", (cb) =>
                  cb.onRef("c.remote_jid", "=", "p.participant_jid").on("c.creds_name", "=", client.sessionName)
                )
                .select(["c.saved_name as name", "p.role", "p.participant_jid as id"])
                .whereRef("p.group_id", "=", "g.id")
            ).as("participants"),
          ])
          .where("g.remote_jid", "=", jid)
          .where("g.creds_name", "=", client.sessionName)
          .executeTakeFirst();

        if (!found) return undefined;

        return {
          ...found,
          participants: found.participants.map((p) => ({
            name: p.name ?? "",
            admin: p.role === "SUPERADMIN" ? "superadmin" : p.role === "ADMIN" ? "admin" : null,
            id: p.id,
          })),
        };
      },
      async getMessage(key) {
        const jid = key.remoteJid;
        const msgId = key.id;

        if (!jid || !msgId) {
          client.runtimeLogger.warning(`Unknown jid and msgId from getMessage. Details: ${JSON.stringify(key)}`);

          return;
        }

        const found = await postgresDb
          .selectFrom("entity as e")
          .innerJoin("message as m", "m.entity_id", "e.id")
          .select("m.message")
          .where("e.remote_jid", "=", jid)
          .where("e.creds_name", "=", client.sessionName)
          .where("m.id", "=", msgId)
          .executeTakeFirst();

        if (!found) return;

        return proto.Message.fromObject(JSON.parse(found.message));
      },
    });

    this.runtimeLogger.verbose(`Adding all ${this.#crons.size} cron jobs`);
    this.#crons.forEach((value) => {
      const fileLogger = new FileLogger(value.name, { loglevel: process.env.IS_DEBUG === "true" ? 0 : 1 });
      CronJob.from({
        cronTime: value.cronTime,
        onTick: async () => {
          if (!this.socket) {
            logger.error("socket is null!");
            return;
          }

          await value.func(fileLogger, this.sessionName, this.socket);
        },
        start: true,
        timeZone: "Asia/Jakarta",
      });
    });

    this.runtimeLogger.verbose(`Adding all ${this.#handlers.size} event handlers`);
    this.#handlers.forEach((value) => {
      this.socket?.ev.on(value.event, (arg) => {
        if (!this.socket) {
          logger.error("socket is null!");
          return;
        }

        value.func(this.socket, arg).catch((err) => {
          this.runtimeLogger.error(`Event ${value.event} Handler errored! Additional info:`);
          this.runtimeLogger.error((err as Error).stack ?? "Unknown.");
          this.setEventSuspendedState(false);
        });
      });
    });

    this.runtimeLogger.verbose(`Adding all ${this.#wsHandlers.size} websocket handlers`);
    this.#wsHandlers.forEach((value) => {
      this.socket?.ws.on(value.event, (arg: BinaryNode) => {
        if (!this.socket) {
          logger.error("socket is null!");
          return;
        }

        value.func(this.socket, arg).catch((err) => {
          this.runtimeLogger.error(`WS ${value.event} Handler errored! Additional info:`);
          this.runtimeLogger.error((err as Error).stack ?? "Unknown.");
        });
      });
    });

    this.runtimeLogger.verbose("Adding creds.update default event handler");
    this.socket.ev.on("creds.update", async () => {
      await this.session?.saveCreds();
    });

    this.runtimeLogger.verbose("Adding connection.update default event handler");
    this.socket.ev.on("connection.update", async (conn) => {
      await this.updateConnection(conn, this.session?.removeCreds ?? (async () => {}));
    });
  }
}
