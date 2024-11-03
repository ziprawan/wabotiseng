import { BufferJSON } from "@whiskeysockets/baileys";
import { writeFileSync } from "node:fs";
import { Client } from "./client";
import { mainHandler } from "./handlers";
import { Messages } from "./utils/classes/message";
import { writeErrorToFile } from "./utils/error/write";
import { edunexCourseListCronJob } from "./crons/edunex/course-list";

const client = new Client("opc", 10);
const whitelist: string[] | null = process.env.WHITELISTS ? process.env.WHITELISTS.split(",") : null;

client.addEventHandler("messages.upsert", async (_sock, event) => {
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

  messages
    .filter((m) => m.key.remoteJid === process.env.DEBUG_ID)
    .forEach((m) => {
      writeFileSync(`json/messages/upsert/${Date.now()}.json`, JSON.stringify(m, BufferJSON.replacer, 2));
    });
});

// client.addCron("edunex", "* */10 * * * *", edunexCourseListCronJob);

client.launch().catch((err) => {
  console.log(err);
  writeErrorToFile(err);
});
