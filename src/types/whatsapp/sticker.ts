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
