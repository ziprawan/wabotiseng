import { IStickerMetadata } from "#bot/types/whatsapp/sticker";
import Sticker from "wa-sticker-formatter";

export async function createSticker(media: Buffer, metadata: IStickerMetadata): Promise<Buffer> {
  const sticker = new Sticker(media, {
    id: metadata["sticker-pack-id"],
    pack: metadata["sticker-pack-name"],
    author: metadata["sticker-pack-publisher"],
    categories: metadata.emojis,
  });

  return await sticker.build();
}
