import { CommandHandlerFunc } from "@/types/command/handler";
import { writeErrorToFile } from "@/utils/error/write";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";
import Sharp from "sharp";

export const stickerCommandHandler: CommandHandlerFunc = async ({ sock, msg }) => {
  const imageMsg = msg.image ?? msg.reply_to_message?.image;

  if (!imageMsg) {
    return await sock.sendMessage(msg.chat, { text: "Kirim gambar atau reply ke pesan gambar!" }, { quoted: msg.raw });
  }

  let doAgain = true;

  while (doAgain) {
    try {
      const imgUrl = imageMsg?.url; // Get the image URL
      const imgKey = getMediaKeys(imageMsg?.mediaKey, "image"); // Get the image media key
      const imgBinary = await downloadEncryptedContent(imgUrl!, imgKey); // Download the image
      const imgBuffer = await streamToBuffer(imgBinary); // Convert the image to a buffer

      const sharpImage = Sharp(imgBuffer); // Create a new Sharp instance
      sharpImage.resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }); // Resize the image to 512x512
      sharpImage.toFormat("webp"); // Convert the image to a WebP format

      const stickerBuffer = await sharpImage.toBuffer(); // Convert the image to a WebP buffer
      doAgain = false;

      return await sock.sendMessage(msg.chat, { sticker: stickerBuffer }, { quoted: msg.raw }); // Send the sticker
    } catch (error) {
      console.log("Failed! Trying again...");
      writeErrorToFile(error);
      continue;
    }
  }
};
