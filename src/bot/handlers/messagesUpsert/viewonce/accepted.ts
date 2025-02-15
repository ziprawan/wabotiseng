import { postgresDb } from "@/database/client";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { Messages } from "#bot/utils/classes/message";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";
import { Audio, Image, Video } from "#bot/types/whatsapp";

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

  const getMessage = await Messages.getMessage(msg.client, msg.chat, request.message_id);
  let viewOnceMessage: Image | Video | Audio | undefined;
  let mediaType: "audio" | "video" | "image" | undefined;
  let caption: string | undefined = undefined;
  let from = "";

  if (getMessage?.viewOnceMessage) {
    const tmpMsg = getMessage.viewOnceMessage;
    viewOnceMessage = tmpMsg.audio ?? tmpMsg.video ?? tmpMsg.image;
    mediaType = tmpMsg.audio ? "audio" : tmpMsg.video ? "video" : "image";
    caption = tmpMsg.text;
    from = tmpMsg.from;
  } else if (getMessage?.audio?.isViewOnce || getMessage?.video?.isViewOnce || getMessage?.image?.isViewOnce) {
    viewOnceMessage = getMessage?.audio ?? getMessage?.video ?? getMessage?.image;
    mediaType = getMessage?.audio ? "audio" : getMessage?.video ? "video" : "image";
    caption = getMessage?.text;
    from = getMessage.from;
  }

  if (!viewOnceMessage) {
    return await msg.replyText("Internal server error", true);
  }

  if (!mediaType) {
    return await msg.replyText("Gagal menentukan jenis media", true);
  }

  if (msg.from !== from) return;

  if (request.accepted) return;

  let retries: number = 10;
  let lastError: string = "";

  while (retries > 0) {
    try {
      const mediaUrl = viewOnceMessage.url;
      const mediaKey = getMediaKeys(viewOnceMessage.mediaKey, mediaType);
      const mediaBinary = await downloadEncryptedContent(mediaUrl, mediaKey);
      const mediaBuffer = await streamToBuffer(mediaBinary);

      retries = 0;

      await sock.sendMessage(
        msg.chat,
        {
          caption: caption ?? undefined,
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
        lastError = (err as Error).message ?? "Unknown.";
      }
      continue;
    }
  }

  await msg.replyText("Gagal mengunduh media! Keterangan:\n\n" + lastError, true);
  await postgresDb.deleteFrom("request_view_once as rvo").where("rvo.id", "=", request.id).execute();
};
