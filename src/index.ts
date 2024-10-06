import { BufferJSON } from "@whiskeysockets/baileys";
import { writeFileSync } from "node:fs";
import { Client } from "./client";
import { mainHandler } from "./handlers";
import { Messages } from "./utils/classes/message";
import { writeErrorToFile } from "./utils/error/write";

const client = new Client("opc", 10);

client.addEventHandler("messages.upsert", async (sock, event) => {
  const { messages } = event;

  event.messages.forEach(async (msgEv) => {
    const message = new Messages(client, msgEv);
    await message.saveMessage();

    await message.handle(mainHandler);
  });

  messages
    .filter((m) => m.key.remoteJid === "120363053159759486@g.us")
    .forEach((m) => {
      writeFileSync(`json/messages/upsert/${Date.now()}.json`, JSON.stringify(m, BufferJSON.replacer, 2));
    });
});

client.launch().catch((err) => {
  console.log(err);
  writeErrorToFile(err);
});
