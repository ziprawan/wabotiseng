import { BufferJSON } from "@whiskeysockets/baileys";
import { writeFileSync } from "node:fs";
import { Client } from "./client";
import { mainHandler } from "./handlers";
import { BaileysEventList } from "./types/events";
import { Messages } from "./utils/classes/message";
import { writeErrorToFile } from "./utils/error/write";
import { FileLogger } from "./utils/logger/file";

const client = new Client(process.env.SESSION_NAME ?? "wa", 10);
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
  const { messages } = event;

  event.messages.forEach(async (msgEv) => {
    const message = new Messages(client, msgEv);
    await message.saveMessage();

    if (!whitelist) {
      await message.handle(mainHandler);
    } else {
      if (whitelist.includes(message.chat)) {
        await message.handle(mainHandler);
      }
    }
  });

  const keys = event.messages.map((m) => m.key);

  await sock.readMessages(keys);

  messages
    .filter((m) => m.key.remoteJid === process.env.DEBUG_ID)
    .forEach((m) => {
      writeFileSync(`json/messages/upsert/${Date.now()}.json`, JSON.stringify(m, BufferJSON.replacer, 2));
    });
});

if (process.env.IS_DEBUG === "true") {
  unhanldedEvents.forEach((ev) => {
    client.addEventHandler(ev, async (sock, event) => {
      const logger = new FileLogger(`${ev}-${Date.now()}`);
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
