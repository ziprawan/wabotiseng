import { CommandHandlerFunc } from "@/types/command/handler";
import { botDatabase } from "@/utils/database/client";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const broadcastHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (msg.from !== process.env.OWNER || msg.chatType !== "private") {
    return;
  }

  const target = parser.args[0];
  const startBroadMsg = parser.args[1];

  const foundTarget = await botDatabase.group.findUnique({
    where: { credsName_remoteJid: { credsName: msg.sessionName, remoteJid: target?.content ?? "" } },
  });

  if (!foundTarget) {
    return await msg.replyText(`Group ${target} is not found!`, true);
  }

  console.log("WOI SINI LU", msg.reply_to_message);

  if (msg.reply_to_message) {
    const repliedMessage = await msg.resolveReplyToMessage();

    if (!repliedMessage) {
      return await msg.replyText(`Sorry! Cannot find that message from my database!`, true);
    }

    try {
      const raw = repliedMessage.raw;
      const caption = repliedMessage.caption;
      const rawMsg = raw.message;

      if (rawMsg) {
        if (rawMsg["audioMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, { audio: media, caption });
        } else if (rawMsg["videoMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, { video: media, caption });
        } else if (rawMsg["imageMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, { image: media, caption });
        } else if (rawMsg["stickerMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, { sticker: media });
        } else if (rawMsg["documentMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, {
            document: media,
            mimetype: rawMsg.documentMessage.mimetype ?? "text/plain",
            caption,
          });
        } else if (rawMsg["ptvMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remoteJid, { video: media, ptv: true, caption });
        } else {
          throw new Error(`Cannot extract message content from replied message`);
        }
      } else {
        throw new Error(`Cannot extract message content from replied message`);
      }
    } catch {
      if (repliedMessage.text.trim() !== "") {
        return await sock.sendMessage(foundTarget.remoteJid, { text: repliedMessage.text });
      } else {
        return await msg.replyText(`Sorry! That message is not supported for broadcasting!`, true);
      }
    }
  }

  if (!startBroadMsg && !msg.reply_to_message) {
    return await msg.replyText(`Please provide a message to broadcast!`, true);
  }

  const broadMsg = parser.text.slice(startBroadMsg.start);

  return await sock.sendMessage(foundTarget.remoteJid, { text: broadMsg });
};
