export type Image = {
  url: string;
  mediaKey: string | Uint8Array;
  mimeType: string;
  fileSize: number;
  height: number;
  width: number;
  thumbnail?: string;
  isViewOnce: boolean;
};
