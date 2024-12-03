// Fix alias import when compiled by tsc
import "module-alias/register";

import { BufferJSON } from "@whiskeysockets/baileys";
import { writeFileSync } from "node:fs";
import { Client } from "./client";
import { projectConfig } from "./config";
import { mainHandler } from "./handlers";
import { BaileysEventList } from "./types/events";
import { Messages } from "./utils/classes/message";
import { writeErrorToFile } from "./utils/error/write";
import { FileLogger } from "./utils/logger/file";

const runtimeLogger = new FileLogger("runtime", { loglevel: process.env.IS_DEBUG === "true" ? 0 : 1 });

const client = new Client(projectConfig.SESSION_NAME ?? "wa", 10, runtimeLogger);

const whitelist: string[] | null = process.env.GROUPS ? process.env.GROUPS.split(",") : null;
if (whitelist)
  runtimeLogger.verbose(`GROUPS env is set! Only receive from these ${whitelist.length} group(s): ${whitelist.join(", ")}.`);
else runtimeLogger.verbose("No whitelist group specified.");

const unhanldedEvents: BaileysEventList[] = [
  "blocklist.set",
  "blocklist.update",
  "call",
  "chats.delete",
  "chats.phoneNumberShare",
  "chats.update",
  "chats.upsert",
  "contacts.update",
  "contacts.upsert",
  "group-participants.update",
  "group.join-request",
  "groups.update",
  "groups.upsert",
  "labels.association",
  "labels.edit",
  "message-receipt.update",
  "messages.delete",
  "messages.media-update",
  "messages.reaction",
  "messages.update",
  "messaging-history.set",
];

runtimeLogger.info("Adding messages.upsert event handler");
client.addEventHandler("messages.upsert", async (sock, event) => {
  try {
    const { messages } = event;
    runtimeLogger.info(`Got new ${messages.length} event(s)!`);

    for (let i = 0; i < messages.length; i++) {
      runtimeLogger.verbose(`Getting message at index ${i}`);
      const msgEv = messages[i];
      const message = new Messages(client, msgEv);

      runtimeLogger.info("Saving message with ID: " + message.id);
      await message.saveMessage();

      if (!whitelist) {
        runtimeLogger.verbose("Whitelist is null, continue handle message");
        await message.handle(mainHandler);
      } else {
        runtimeLogger.verbose("Whitelist exists, checking for chatId");
        if (whitelist.includes(message.chat)) {
          runtimeLogger.verbose(`Chat with ID: ${message.chat} included in the whitelist, continue handle message.`);
          await message.handle(mainHandler);
        } else {
          runtimeLogger.verbose(`Chat with ID: ${message.chat} isn't included in the whitelist, ignoring.`);
        }
      }
    }

    runtimeLogger.info("Gathering all received keys");
    const keys = event.messages.map((m) => m.key);

    runtimeLogger.info(`Reading all ${messages.length} message(s) with all gathered keys`);
    await sock.readMessages(keys);

    messages
      .filter((m) => m.key.remoteJid === process.env.DEBUG_ID)
      .forEach((m) => {
        writeFileSync(`json/messages/upsert/${Date.now()}.json`, JSON.stringify(m, BufferJSON.replacer, 2));
      });
  } catch (err) {
    runtimeLogger.error("RUNTIME ERROR! Located at src > index > addEventHandler[0]");
    runtimeLogger.error((err as Error).stack ?? (err as Error).message);
  }
});

if (process.env.IS_DEBUG === "true") {
  runtimeLogger.verbose("IS_DEBUG is true! Capturing all unhandled events to logs/events!");
  unhanldedEvents.forEach((ev) => {
    runtimeLogger.verbose(`Adding capture for event: ${ev}`);
    client.addEventHandler(ev, async (_sock, event) => {
      runtimeLogger.verbose(`Capturing event: ${ev}`);
      const logger = new FileLogger(ev, { folder: "logs/events" });
      logger._write(`Event: ${ev}`);
      logger._write(`Data: ${JSON.stringify(event, BufferJSON.replacer, 2)}`);
      logger.close();
      runtimeLogger.verbose(`Capture done`);
    });
  });
}

// client.addCron("edunex", "* */10 * * * *", edunexCourseListCronJob);

runtimeLogger.info("Launching client");
client.launch().catch((err) => {
  console.log(err);
  writeErrorToFile(err);
});
