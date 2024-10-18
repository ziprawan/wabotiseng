import { CommandHandlerFunc } from "@/types/command/handler";
import { IStickerMetadata } from "@/types/whatsapp/sticker";
import { writeErrorToFile } from "@/utils/error/write";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";
import Sharp from "sharp";
import * as Emoji from "node-emoji";
import { buildStickerExif } from "@/utils/whatsapp/stickers/buildExif";
import { Categories } from "wa-sticker-formatter";
import { createSticker } from "@/utils/whatsapp/stickers/createSticker";

export const stickerCommandHandler: CommandHandlerFunc = async ({ sock, msg, parser }) => {
  const imageMsg = msg.image ?? msg.reply_to_message?.image;

  if (!imageMsg) {
    return await sock.sendMessage(
      msg.chat,
      { text: "Please send an image message or reply to image message!" },
      { quoted: msg.raw }
    );
  }

  let doAgain = true;

  while (doAgain) {
    try {
      const emojis = parser.args[0];

      // https://stackoverflow.com/a/68602748
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      const segments = segmenter.segment(emojis);
      const emojisArray = [...new Set(Array.from(segments, (s) => s.segment).filter((s) => Emoji.which(s)))];

      console.log(emojisArray);
      const stickerMetadata: IStickerMetadata = {
        "sticker-pack-id": `opc_sticker_packs`,
        "sticker-pack-name": `OPC Bot`,
        "sticker-pack-publisher": `${msg.raw.pushName ?? "fulan"}`,
        emojis: emojisArray as Categories[],
      };

      const imgUrl = imageMsg?.url; // Get the image URL
      const imgKey = getMediaKeys(imageMsg?.mediaKey, "image"); // Get the image media key
      const imgBinary = await downloadEncryptedContent(imgUrl!, imgKey); // Download the image
      const imgBuffer = await streamToBuffer(imgBinary); // Convert the image to a buffer

      const sharpImage = Sharp(imgBuffer); // Create a new Sharp instance
      sharpImage.resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }); // Resize the image to 512x512
      sharpImage.toFormat("webp"); // Convert the image to a WebP format

      const stickerBuffer = await sharpImage.toBuffer(); // Convert the image to a WebP buffer
      const stickerWithMetadata = await createSticker(stickerBuffer, stickerMetadata); // Create the sticker with metadata
      doAgain = false;

      return await sock.sendMessage(msg.chat, { sticker: stickerWithMetadata }, { quoted: msg.raw }); // Send the sticker
    } catch (error) {
      console.log("Failed! Trying again...");
      writeErrorToFile(error);
      continue;
    }
  }
};
