import { Categories } from "wa-sticker-formatter";

export type Sticker = {
  url: string;
  mediaKey: string | Uint8Array;
  mimeType: string;
  height: number;
  width: number;
  fileSize: number;
  isAnimated: boolean;
  isAvatar: boolean;
  isAISticker: boolean;
  isLottie: boolean;
};

export interface IStickerMetadata {
  /** I think this android-app-store-link is unnecessary */
  "android-app-store-link"?: string;
  "sticker-pack-id"?: string;
  "sticker-pack-name"?: string;
  "sticker-pack-publisher"?: string;
  emojis?: Categories[];
}
