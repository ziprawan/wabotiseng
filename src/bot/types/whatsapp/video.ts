export type Video = {
  url: string;
  mediaKey: string | Uint8Array;
  mimeType: string;
  fileSize: number;
  height: number;
  width: number;
  duration: number;
  isViewOnce: boolean;
  thumbnail?: string;
};
