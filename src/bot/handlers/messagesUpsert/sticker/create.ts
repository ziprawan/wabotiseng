import { pola_pikir } from "#bot/stickers";
import { CommandHandlerFunc } from "#bot/types/command/handler";
import { IStickerMetadata } from "#bot/types/whatsapp/sticker";
import { isLiterallyDecimal } from "@/utils/generics/isNumeric";
import { streamToBuffer } from "@/utils/stream/toBuffer";
import { createSticker } from "#bot/utils/whatsapp/stickers/createSticker";
import { downloadEncryptedContent, getMediaKeys } from "@whiskeysockets/baileys";
import ffmpeg from "fluent-ffmpeg";
import * as Emoji from "node-emoji";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import Sharp from "sharp";
import { Categories } from "wa-sticker-formatter";

export const stickerCommandHandler: CommandHandlerFunc = async ({ sock, msg, parser }) => {
  const imageMsg = msg.image ?? msg.reply_to_message?.image;
  const videoMsg = msg.video ?? msg.reply_to_message?.video;

  const args = parser.args();

  if (videoMsg) {
    if (videoMsg.fileSize > 5 * 1024 * 1024) {
      /* 5 MB */
      return await msg.replyText("Waduh, ukurannya kegedean 🥵", true);
    }

    let retries: number = 10;
    let lastError: string = "";

    while (retries > 0) {
      try {
        const emojis = args[0]?.content;

        // https://stackoverflow.com/a/68602748
        const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
        const segments = segmenter.segment(emojis);
        const emojisArray = [...new Set(Array.from(segments, (s) => s.segment).filter((s) => Emoji.which(s)))];

        const stickerMetadata: IStickerMetadata = {
          "sticker-pack-id": `opc_sticker_packs`,
          "sticker-pack-name": `OPC Bot`,
          "sticker-pack-publisher": `${msg.raw.pushName ?? "fulan"}`,
          emojis: emojisArray as Categories[],
        };

        const filename = `tmp/stk-${Date.now()}`;
        const vidUrl = videoMsg?.url; // Get the image URL
        const vidKey = getMediaKeys(videoMsg?.mediaKey, "video"); // Get the video media key
        const vidBinary = await downloadEncryptedContent(vidUrl!, vidKey); // Download the video
        const vidBuffer = await streamToBuffer(vidBinary);

        // @ts-ignore
        writeFileSync(filename, vidBuffer);

        return ffmpeg(filename).ffprobe(async (err, data) => {
          if (err) {
            return await msg.replyText((err as Error).message, true);
          }

          const videoStreams = data.streams.filter((f) => f.codec_type === "video");

          if (videoStreams.length > 1) {
            return await msg.replyText("Video ini buak video biasa (it has multiple video streams)", true);
          } else if (videoStreams.length === 0) {
            return await msg.replyText("Video ini tidak mengandung video (terasa aneh tapi possible)", true);
          }

          const duration = videoStreams[0].duration ?? "";

          if (!isLiterallyDecimal(duration)) {
            return await msg.replyText("Tidak dapat mengambil durasi video! Mungkin video tidak valid?", true);
          }

          const length = Math.min(9.8, parseInt(duration));

          const webpStream = ffmpeg(filename).noAudio().setDuration(length).format("webp").pipe();
          const webpChunks: Buffer[] = [];
          webpStream.on("data", (chunk) => {
            webpChunks.push(chunk);
          });

          return webpStream.on("end", async () => {
            // @ts-ignore
            const webpBuffer = Buffer.concat(webpChunks);

            const sharpImage = Sharp(webpBuffer, { animated: true }); // Create a new Sharp instance
            sharpImage.resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }); // Resize the image to 512x512
            sharpImage.toFormat("webp"); // Convert the image to a WebP format

            const stickerBuffer = await sharpImage.toBuffer(); // Convert the image to a WebP buffer
            const stickerWithMetadata = await createSticker(stickerBuffer, stickerMetadata); // Create the sticker with metadata
            retries = 0;

            if (existsSync(filename)) {
              rmSync(filename);
            }

            return await sock.sendMessage(msg.chat, { sticker: stickerWithMetadata }, { quoted: msg.raw }); // Send the sticker
          });
        });
      } catch (err) {
        retries--;
        lastError = (err as Error).stack ?? "Unknown.";
        continue;
      }
    }

    return await msg.replyText("Gagal mengunduh media! Keterangan:\n\n" + lastError, true);
  }

  if (!imageMsg) {
    return await sock.sendMessage(msg.chat, { sticker: pola_pikir }, { quoted: msg.raw });
  }

  let retries = 10;
  let lastError = "";

  while (retries > 0) {
    try {
      const emojis = args[0]?.content;

      // https://stackoverflow.com/a/68602748
      const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
      const segments = segmenter.segment(emojis);
      const emojisArray = [...new Set(Array.from(segments, (s) => s.segment).filter((s) => Emoji.which(s)))];

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
      retries = 0;

      return await sock.sendMessage(msg.chat, { sticker: stickerWithMetadata }, { quoted: msg.raw }); // Send the sticker
    } catch (err) {
      lastError = (err as Error).stack ?? "Unknown.";
      continue;
    }
  }

  return await msg.replyText("Gagal mengunduh media! Keterangan:\n\n" + lastError, true);
};
