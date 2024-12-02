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

const client = new Client(projectConfig.SESSION_NAME ?? "wa", 10);
const whitelist: string[] | null = process.env.GROUPS ? process.env.GROUPS.split(",") : null;
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

client.addEventHandler("messages.upsert", async (sock, event) => {
  try {
    const { messages } = event;

    event.messages.forEach(async (msgEv) => {
      try {
        const message = new Messages(client, msgEv);
        try {
          await message.saveMessage();
        } catch (err) {
          writeErrorToFile(err, "src.index.messages.upsert.forEach.saveMessage");
        }

        if (!whitelist) {
          await message.handle(mainHandler);
        } else {
          if (whitelist.includes(message.chat)) {
            await message.handle(mainHandler);
          }
        }
      } catch (err) {
        writeErrorToFile(err, "src.index.messages.upsert.forEach");
      }
    });

    const keys = event.messages.map((m) => m.key);

    await sock.readMessages(keys);

    messages
      .filter((m) => m.key.remoteJid === process.env.DEBUG_ID)
      .forEach((m) => {
        writeFileSync(`json/messages/upsert/${Date.now()}.json`, JSON.stringify(m, BufferJSON.replacer, 2));
      });
  } catch (err) {
    writeErrorToFile(err, "src.index.messages.upsert");
  }
});

if (process.env.IS_DEBUG === "true") {
  unhanldedEvents.forEach((ev) => {
    client.addEventHandler(ev, async (sock, event) => {
      const logger = new FileLogger(ev, "logs/events");
      logger.write(`Event: ${ev}`);
      logger.write(`Data: ${JSON.stringify(event, BufferJSON.replacer, 2)}`);
      logger.close();
    });
  });
}

// client.addCron("edunex", "* */10 * * * *", edunexCourseListCronJob);

client.launch().catch((err) => {
  console.log(err);
  writeErrorToFile(err);
});
