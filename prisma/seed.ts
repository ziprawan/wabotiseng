import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { proto } from "@whiskeysockets/baileys";

const botDatabase = new PrismaClient();

async function main() {
  await botDatabase.message.updateMany({ data: { deleted: false } });
  const deletes = await botDatabase.message.findMany({
    where: { message: { contains: `"type":"REVOKE"` }, credsName: process.env.SESSION_NAME ?? "wa" },
  });

  for (let i = 0; i < deletes.length; i++) {
    const msg = deletes[i];
    const raw = JSON.parse(msg.message) as proto.WebMessageInfo;
    const ptc = raw.message?.protocolMessage;

    if (!ptc) {
      console.log("Skipping...");
      continue;
    }

    console.log(msg.remoteJid, ptc.key?.id);

    try {
      if (msg.remoteJid === "status@broadcast") {
        await botDatabase.message.delete({
          where: {
            messageId_remoteJid_credsName: {
              credsName: process.env.SESSION_NAME ?? "wa",
              messageId: ptc.key?.id ?? "",
              remoteJid: msg.remoteJid,
            },
          },
        });
      } else {
        await botDatabase.message.update({
          where: {
            messageId_remoteJid_credsName: {
              credsName: process.env.SESSION_NAME ?? "wa",
              messageId: ptc.key?.id ?? "",
              remoteJid: msg.remoteJid,
            },
          },
          data: { deleted: true },
        });
      }
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError && err.code === "P2025") {
        console.warn("Record not found!");
        continue;
      } else {
        console.error("UNCAUGHT ERROR!!!");
        console.error(err);
      }
    }
  }

  // await botDatabase.message.deleteMany({
  //   where: { message: { contains: '"type":"REVOKE"' }, credsName: process.env.SESSION_NAME ?? "wa" },
  // });
}

main()
  .catch((err) => {
    console.log(err);
  })
  .finally(() => {
    console.log("DONE!!!");
  });
