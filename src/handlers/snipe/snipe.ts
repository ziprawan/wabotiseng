import { postgresDb } from "@/database/client";
import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { AnyMessageContent, downloadMediaMessage, getContentType, jidDecode, MediaType } from "@whiskeysockets/baileys";

export const snipeHandler = async ({ msg, sock }: { msg: Messages; sock: WASocket }) => {
  const found = await postgresDb
    .selectFrom("message as m")
    .select(["m.message", "m.id"])
    .innerJoin("entity as e", "e.id", "m.entity_id")
    .where("m.deleted", "=", true)
    .where("e.remote_jid", "=", msg.chat)
    .where("e.creds_name", "=", msg.sessionName)
    .executeTakeFirst();

  if (!found) {
    return msg.replyText("No more deleted message found!", true);
  }

  const snipeMessage = new Messages(msg.client, JSON.parse(found.message));
  await postgresDb.updateTable("message").set({ deleted: null }).where("id", "=", found.id).execute();

  try {
    const mediaBuffer = await downloadMediaMessage(
      snipeMessage.raw,
      "buffer",
      {},
      { reuploadRequest: sock.updateMediaMessage, logger: sock.logger }
    );

    if (!snipeMessage.raw.message) {
      return await msg.replyText("[SNP002] Internal server error.", true);
    }

    const contentType = getContentType(snipeMessage.raw.message);
    let mediaType: MediaType = contentType?.replace("Message", "") as MediaType;
    const media = snipeMessage.raw.message[contentType!];

    const text = `@${jidDecode(snipeMessage.from)?.user}: ${snipeMessage.text}`;
    const mentions = [...new Set([snipeMessage.from, ...(snipeMessage.mentions ?? [])])];

    if (!media || typeof media !== "object" || (!("url" in media) && !("thumbnailDirectPath" in media))) {
      return await msg.replyText("[SNP003] Internal server error.", true);
    }

    if ("thumbnailDirectPath" in media && !("url" in media)) {
      mediaType = "thumbnail-link";
    }

    let content: AnyMessageContent | null = null;

    switch (mediaType) {
      case "audio":
        content = { audio: mediaBuffer, ptt: false, caption: text, mentions };
        break;
      case "document":
        content = { document: mediaBuffer, mimetype: msg.document?.mimeType ?? "text/plain", caption: text, mentions };
        break;
      case "gif":
        content = { video: mediaBuffer, gifPlayback: true, caption: text, mentions };
        break;
      case "image":
        content = { image: mediaBuffer, caption: text, mentions };
        break;
      case "ptt":
        content = { audio: mediaBuffer, ptt: true, mentions };
        break;
      case "sticker":
        content = { sticker: mediaBuffer, mentions };
        break;
      case "video":
        content = { video: mediaBuffer, caption: text, mentions };
        break;
      case "ptv":
        content = { video: mediaBuffer, ptv: true, caption: text, mentions };
        break;
      default:
        content = null;
    }

    if (content === null) {
      return await msg.replyText(
        `[SNP004] Unable to determine media type! More info:\nmessageId: ${msg.id}\nmediaType: ${mediaType}`,
        true
      );
    }

    return await sock.sendMessage(msg.chat, content, { quoted: msg.raw });
  } catch (err) {
    const text = snipeMessage.text;

    if (!text) {
      return await msg.replyText("[SNP005] Unsupported message type!", true);
    }

    return await sock.sendMessage(
      msg.chat,
      {
        text: `@${jidDecode(snipeMessage.from)?.user}: ${text}`,
        mentions: [...new Set([snipeMessage.from, ...(snipeMessage.mentions ?? [])])],
      },
      { quoted: msg.raw }
    );
  }
};
