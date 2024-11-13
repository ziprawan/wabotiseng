import { CommandHandlerFunc } from "@/types/command/handler";
import { WASocket } from "@/types/socket";
import { Messages } from "@/utils/classes/message";
import { botDatabase } from "@/utils/database/client";
import {
  AnyMessageContent,
  downloadMediaMessage,
  getContentType,
  jidDecode,
  jidNormalizedUser,
  MediaType,
} from "@whiskeysockets/baileys";

export const snipeHandler = async ({ msg, sock }: { msg: Messages; sock: WASocket }) => {
  const found = await botDatabase.message.findFirst({
    where: { deleted: true, remoteJid: msg.chat, credsName: msg.sessionName },
    orderBy: { createdAt: "desc" },
  });

  if (!found) {
    console.log("Aneh");
    return;
  }

  const snipeMessage = new Messages(msg.client, JSON.parse(found.message));
  await botDatabase.message.update({ where: { id: found.id }, data: { deleted: null } });

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
      return await msg.replyText("[SP004] Unable to determine media type!", true);
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
