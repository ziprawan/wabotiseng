import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { Messages } from "#bot/utils/classes/message";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";

export const viewOnceAcceptHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reaction) return;

  const resolvedReactMsg = await msg.reaction.resolveReactedMessage();

  if (!resolvedReactMsg) {
    return;
  }

  if (msg.reaction.content !== "✅") return;

  if (!resolvedReactMsg.msgKey.fromMe) return;

  const conversation = resolvedReactMsg.conversation;

  if (!conversation) return;

  const request = await postgresDb
    .selectFrom("request_view_once as rvo")
    .select(["rvo.message_id", "rvo.accepted", "rvo.id"])
    .innerJoin("entity as e", "e.id", "rvo.entity_id")
    .where("rvo.confirm_id", "=", resolvedReactMsg.id ?? "")
    .where("e.remote_jid", "=", msg.chat)
    .where("e.creds_name", "=", msg.sessionName)
    .executeTakeFirst();

  if (!request) {
    return;
  }

  const viewOnceMessage = (await Messages.getMessage(msg.client, msg.chat, request.message_id))?.viewOnceMessage;
  if (!viewOnceMessage) {
    return;
  }

  if (msg.from !== viewOnceMessage.from) return;

  const mediaMessage = viewOnceMessage.audio ?? viewOnceMessage.video ?? viewOnceMessage.image ?? undefined;
  if (!mediaMessage) {
    await msg.replyText(JSON.stringify(viewOnceMessage));
    return await sock.sendMessage(msg.chat, { text: "Unable to determine media type!" }, { quoted: msg.raw });
  }

  const mediaType = viewOnceMessage.audio ? "audio" : viewOnceMessage.video ? "video" : "image";

  if (request.accepted) return;

  let retries: number = 10;
  let lastError: string = "";

  while (retries > 0) {
    try {
      const mediaUrl = mediaMessage.url;
      const mediaKey = getMediaKeys(mediaMessage.mediaKey, mediaType);
      const mediaBinary = await downloadEncryptedContent(mediaUrl, mediaKey);
      const mediaBuffer = await streamToBuffer(mediaBinary);

      retries = 0;

      await sock.sendMessage(
        msg.chat,
        {
          caption: viewOnceMessage.text ?? undefined,
          ...(mediaType === "image"
            ? { image: mediaBuffer }
            : mediaType === "video"
            ? { video: mediaBuffer }
            : { audio: mediaBuffer }),
          mentions: msg.mentions,
        },
        { quoted: msg.raw }
      );
      return await postgresDb
        .updateTable("request_view_once as rvo")
        .where("rvo.id", "=", request.id)
        .set({ accepted: true })
        .execute();
    } catch (err) {
      retries--;
      if (retries <= 0) {
        lastError = (err as Error).stack ?? "Unknown.";
      }
      continue;
    }
  }

  await msg.replyText("Gagal mengunduh media! Keterangan:\n\n" + lastError, true);
  await postgresDb.deleteFrom("request_view_once as rvo").where("rvo.id", "=", request.id).execute();
};
