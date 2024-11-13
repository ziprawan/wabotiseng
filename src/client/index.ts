import { DatabaseSession } from "@/types/client";
import { CronFunc } from "@/types/cron";
import { BaileysEventList, EventHandlerFunc, WSHandlerFunc } from "@/types/events";
import { writeErrorToFile } from "@/utils/error/write";
import { FileLogger } from "@/utils/logger/file";
import { useDatabaseAuthState } from "@/utils/session/manager";
import { sleep } from "@/utils/sleep";
import { Boom } from "@hapi/boom";
import makeWASocket, { BinaryNode, ConnectionState, DisconnectReason, WASocket } from "@whiskeysockets/baileys";
import { CronJob } from "cron";
import NodeCache, { EventEmitter } from "node-cache";
import Pino from "pino";

const Logger = Pino({
  timestamp() {
    return `,"time":"${new Date().toJSON()}"`;
  },
});
const logger = Logger.child({});
logger.level = "trace";

const msgRetryCounterCache = new NodeCache();

export class Client extends EventEmitter {
  /**
   * @constructor
   */
  constructor(sessionName: string, private maxReconnectFails: number = 5) {
    super();

    this.sessionName = sessionName;
    this.reconnectFail = 0;
    this.logger = logger;
    this.caches = {};
  }

  public sessionName: string;
  public socket?: WASocket;
  public session?: DatabaseSession;
  public logger: typeof Logger;
  public caches: Record<string, any>;

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
    this.reconnectFail++;

    if (this.reconnectFail >= this.maxReconnectFails) {
      // Crash the program to save memory usage >:(
      console.error(`Max reconnect fails reached! Exiting...`);
      process.exit();
    }

    await sleep(3000);
    return;
  }

  addCron(name: string, cronTime: string | Date, func: CronFunc): Client {
    this.#crons.add({ name, cronTime, func });
    return this;
  }

  /**
   * Default function handler fpr "connection.update"
   * @param ev Event object
   * @param removeCreds Function to remove the credentials when loggedOut
   */
  async updateConnection(ev: Partial<ConnectionState>, removeCreds: () => Promise<void>) {
    const { lastDisconnect, connection } = ev;
    const reason = new Boom(lastDisconnect?.error).output.statusCode;

    if (connection === "close") {
      if (reason === DisconnectReason.badSession) {
        logger.error(`Bad Session, Please Delete /auth and Scan Again`);
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        await this.wait();
        logger.warn("Connection closed, reconnecting....");
        await this.launch();
      } else if (reason === DisconnectReason.connectionLost) {
        await this.wait();
        logger.warn("Connection Lost from Server, reconnecting...");
        await this.launch();
      } else if (reason === DisconnectReason.connectionReplaced) {
        logger.error("Connection Replaced, Another New Session Opened, Please Close Current Session First");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        logger.error(`Device Logged Out, Proceed to delete your credentials!`);
        await removeCreds();
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        logger.info("Restart Required, Restarting...");
        await this.launch();
      } else if (reason === DisconnectReason.timedOut) {
        await this.wait();
        logger.warn("Connection TimedOut, Reconnecting...");
        await this.launch();
      } else {
        logger.warn(`Unknown DisconnectReason: ${reason}: ${connection}`);
        await this.launch();
      }
    } else if (connection === "open") {
      logger.info("Connection opened.");
    }
  }

  /**
   * Launch client
   * @returns {Promise<void>}
   */
  async launch(): Promise<void> {
    this.session = await useDatabaseAuthState(this.sessionName);
    this.socket = makeWASocket({
      auth: this.session.state,
      logger: this.logger,
      printQRInTerminal: true,
      generateHighQualityLinkPreview: true,
      msgRetryCounterCache,
    });

    this.#crons.forEach((value) => {
      const fileLogger = new FileLogger(value.name);
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

    this.#handlers.forEach((value) => {
      this.socket?.ev.on(value.event, (arg) => {
        if (!this.socket) {
          logger.error("socket is null!");
          return;
        }

        value.func(this.socket, arg).catch((err) => {
          writeErrorToFile(err);
        });
      });
    });

    this.#wsHandlers.forEach((value) => {
      this.socket?.ws.on(value.event, (arg: BinaryNode) => {
        if (!this.socket) {
          logger.error("socket is null!");
          return;
        }

        value.func(this.socket, arg).catch((err) => {
          writeErrorToFile(err);
        });
      });
    });

    this.socket.ev.on("creds.update", async () => {
      await this.session?.saveCreds();
    });

    this.socket.ev.on("connection.update", async (conn) => {
      await this.updateConnection(conn, this.session?.removeCreds ?? (async () => {}));
    });
  }
}
