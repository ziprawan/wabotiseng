import { projectConfig } from "@/config";
import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export const broadcastHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (msg.from !== projectConfig.OWNER || msg.chatType !== "private") {
    return;
  }

  const args = parser.args();
  const target = args[0];
  const startBroadMsg = args[1];

  const foundTarget = await postgresDb
    .selectFrom("group as g")
    .innerJoin("entity as e", "e.id", "g.entity_id")
    .select(["e.remote_jid"])
    .where("e.creds_name", "=", msg.sessionName)
    .where("e.remote_jid", "=", target?.content ?? "")
    .executeTakeFirst();

  if (!foundTarget) {
    return await msg.replyText(`Group ${target} is not found!`, true);
  }

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
          return await sock.sendMessage(foundTarget.remote_jid, { audio: media, caption });
        } else if (rawMsg["videoMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remote_jid, { video: media, caption });
        } else if (rawMsg["imageMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remote_jid, { image: media, caption });
        } else if (rawMsg["stickerMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remote_jid, { sticker: media });
        } else if (rawMsg["documentMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remote_jid, {
            document: media,
            mimetype: rawMsg.documentMessage.mimetype ?? "text/plain",
            caption,
          });
        } else if (rawMsg["ptvMessage"]) {
          const media = await downloadMediaMessage(raw, "buffer", {});
          return await sock.sendMessage(foundTarget.remote_jid, { video: media, ptv: true, caption });
        } else {
          throw new Error(`Cannot extract message content from replied message`);
        }
      } else {
        throw new Error(`Cannot extract message content from replied message`);
      }
    } catch {
      if (repliedMessage.text.trim() !== "") {
        return await sock.sendMessage(foundTarget.remote_jid, { text: repliedMessage.text });
      } else {
        return await msg.replyText(`Sorry! That message is not supported for broadcasting!`, true);
      }
    }
  }

  if (!startBroadMsg && !msg.reply_to_message) {
    return await msg.replyText(`Please provide a message to broadcast!`, true);
  }

  const broadMsg = parser.text.slice(startBroadMsg.start);

  return await sock.sendMessage(foundTarget.remote_jid, { text: broadMsg });
};
