export type Voice = {
  url: string;
  mediaKey: string | Uint8Array;
  mimeType: string;
  fileSize: number;
  duration: number;
  // thumbnail?: string;
  isViewOnce: boolean;
};
