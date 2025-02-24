import { projectConfig } from "@/config";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { AnyMessageContent, downloadMediaMessage, WAMessage } from "@whiskeysockets/baileys";

const CONFESS_TARGET = projectConfig.CONFESS_TARGET;

export const confessHandler: CommandHandlerFunc = async ({ msg, parser, sock }) => {
  if (!CONFESS_TARGET) return;

  if (!msg.from || msg.chatType !== "private") {
    return;
  }

  const confessMsg = msg.reply_to_message ? msg.reply_to_message : msg;
  const isRepliedMessage = msg.reply_to_message !== undefined;

  async function resolveMedia(rawMsg: WAMessage): Promise<Buffer | null> {
    try {
      return await downloadMediaMessage(rawMsg, "buffer", {});
    } catch (err) {
      if ((err as Error).message.includes("message is not a media message")) {
        return null;
      }

      await msg.replyText("Terjadi kesalahan saat mengunduh media.");
      return null;
    }
  }

  const args = parser.args();
  const currentText = args[0];
  const raw = confessMsg.raw;
  const rawMsg = raw.message;
  const txt = confessMsg.text;
  let caption = "";

  if (!rawMsg) {
    return await msg.replyText("Ada yang salah saat mengambil konten pesan!");
  }

  if (txt) {
    if (currentText) {
      caption = `Chat! Ada konfes dari seseorang nih!\n`;
      if (txt && isRepliedMessage) caption += txt + "\n\n";
      caption += parser.text.slice(currentText.start);
    }
  } else if (currentText) {
    caption = `Chat! Ada konfes dari seseorang nih!\n${parser.text.slice(currentText.start)}`;
  }

  let sendMessageContent: AnyMessageContent | null = null;
  const media = await resolveMedia(raw);

  if (rawMsg["audioMessage"]) {
    sendMessageContent = media && { audio: media, ptt: false, caption };
  } else if (rawMsg["videoMessage"]) {
    sendMessageContent = media && { video: media, caption };
  } else if (rawMsg["imageMessage"]) {
    sendMessageContent = media && { image: media, caption };
  } else if (rawMsg["documentMessage"]) {
    sendMessageContent = media && { document: media, mimetype: rawMsg.documentMessage.mimetype ?? "text/plain", caption };
  } else if (rawMsg["stickerMessage"]) {
    sendMessageContent = media && { sticker: media };
  } else if (rawMsg["ptvMessage"]) {
    sendMessageContent = media && { video: media, ptv: true, caption };
  } else if (txt !== "" && caption !== "") {
    sendMessageContent = { text: caption };
  }

  try {
    if (!sendMessageContent) {
      return await msg.replyText("Kasih pesannya dong kak", true);
    }

    const sentMsg = await sock.sendMessage(projectConfig.CONFESS_TARGET, sendMessageContent);
    if (sentMsg?.message?.stickerMessage) {
      await sock.sendMessage(projectConfig.CONFESS_TARGET, { text: caption }, { quoted: sentMsg });
    }
  } catch {
    return await msg.replyText("Terjadi kesalahan saat mengirim pesan");
  }
};
