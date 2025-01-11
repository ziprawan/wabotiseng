import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "@/types/command/handler";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";

export const viewOnceCommandHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  if (!msg.reply_to_message) {
    return await msg.replyText("Please reply to a message that you want to view a view once message!", true);
  }

  const resolvedReply = await msg.resolveReplyToMessage(true);

  if (!resolvedReply) {
    return await sock.sendMessage(msg.chat, { text: "Message not found." }, { quoted: msg.raw });
  }

  let viewOnceMessage = resolvedReply.viewOnceMessage;

  if (!viewOnceMessage && msg.reply_to_message.viewOnceMessage) {
    await msg.reply_to_message.saveMessage({ dismissChat: true });
    viewOnceMessage = msg.reply_to_message.viewOnceMessage;
  }

  if (!viewOnceMessage) {
    return await sock.sendMessage(
      msg.chat,
      { text: "The replied message is not a view once message!" },
      { quoted: msg.raw }
    );
  }

  const mediaMessage = viewOnceMessage.audio ?? viewOnceMessage.video ?? viewOnceMessage.image ?? undefined;
  if (!mediaMessage) {
    return await sock.sendMessage(msg.chat, { text: "Unable to determine media type!" }, { quoted: msg.raw });
  }

  const mediaType = viewOnceMessage.audio ? "audio" : viewOnceMessage.video ? "video" : "image";

  if (resolvedReply.from === msg.from) {
    let retries: number = 10;
    let lastError: string = "";

    while (retries > 0) {
      try {
        const mediaUrl = mediaMessage.url;
        const mediaKey = getMediaKeys(mediaMessage.mediaKey, mediaType);
        const mediaBinary = await downloadEncryptedContent(mediaUrl, mediaKey);
        const mediaBuffer = await streamToBuffer(mediaBinary);

        retries = 0;

        return await sock.sendMessage(
          msg.chat,
          {
            caption: viewOnceMessage.text ?? undefined,
            ...(mediaType === "image"
              ? { image: mediaBuffer }
              : mediaType === "video"
              ? { video: mediaBuffer }
              : { audio: mediaBuffer }),
          },
          { quoted: msg.raw }
        );
      } catch (err) {
        retries--;
        lastError = (err as Error).stack ?? "Unknown.";
        continue;
      }
    }

    return await msg.replyText("Gagal mengunduh media! Keterangan:\n\n" + lastError, true);
  }

  const request = await postgresDb
    .selectFrom("request_view_once as rvo")
    .select(["accepted", "requested_by"])
    .innerJoin("entity as e", "e.id", "rvo.entity_id")
    .where("rvo.message_id", "=", resolvedReply.id ?? "")
    .where("e.remote_jid", "=", resolvedReply.remoteJid ?? "")
    .where("e.creds_name", "=", msg.sessionName)
    .executeTakeFirst();

  if (request) {
    const requestedBy = request.requested_by;
    const requestedNumber = requestedBy.split("@")[0];

    return await sock.sendMessage(
      msg.chat,
      {
        text: request.accepted ? `That message already viewed` : `That message already requested by @${requestedNumber}`,
        mentions: [requestedBy],
      },
      { quoted: msg.raw }
    );
  }

  if (!resolvedReply.id || !resolvedReply.remoteJid) {
    return await sock.sendMessage(msg.chat, { text: "Failed to get message ID or chat ID!" }, { quoted: msg.raw });
  }

  const fromNumber = resolvedReply.from.split("@")[0];

  const sent = await sock.sendMessage(
    msg.chat,
    {
      text: `Waiting for @${fromNumber} to react this message with ✅`,
      mentions: [resolvedReply.from],
    },
    { quoted: msg.raw }
  );

  try {
    await postgresDb
      .insertInto("request_view_once")
      .values(({ selectFrom }) => ({
        message_id: resolvedReply.id ?? "",
        confirm_id: sent?.key.id ?? "",
        entity_id: selectFrom("entity as e")
          .select("e.id")
          .where("e.creds_name", "=", msg.sessionName)
          .where("e.remote_jid", "=", resolvedReply.remoteJid ?? ""),
        requested_by: msg.from,
      }))
      .onConflict((oc) => oc.columns(["confirm_id", "entity_id"]).doNothing())
      .onConflict((oc) => oc.columns(["message_id", "entity_id"]).doNothing())
      .execute();
  } catch (err) {
    return await msg.replyText(
      `Something went wrong while inserting request into database! Additional info:\n\n${(err as Error).stack}`
    );
  }
};
