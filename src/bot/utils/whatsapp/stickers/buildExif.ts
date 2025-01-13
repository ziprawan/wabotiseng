import { IStickerMetadata } from "#bot/types/whatsapp/sticker";
import { chunkSubstr } from "@/utils/string/chunk";

export function buildStickerExif(metadata: IStickerMetadata): Buffer {
  const metadataString = JSON.stringify(metadata);
  const exifLength = chunkSubstr(metadataString.length.toString(16), 2).map((n) => parseInt(n, 16));
  const exif = Buffer.from([
    // Byte align 'Intel'
    0x49,
    0x49,
    0x2a,
    0x00,
    // IFD Starts at 0x00000008
    0x08,
    0x00,
    0x00,
    0x00,
    // IFD has only 1 directory entry
    0x01,
    0x00,
    // IFD Tag ID always 0x5741 (for whatsapp stickers)
    0x41,
    0x57,
    // Tag type is 0x07 (undefined)
    0x07,
    0x00,
    // Define the length of the tag
    ...exifLength,
    // Offset to the tag value
    0x16,
    0x00,
    0x00,
    0x00,
    // Tag value
    ...Buffer.from(metadataString, "utf-8"),
  ]);

  return exif;
}
