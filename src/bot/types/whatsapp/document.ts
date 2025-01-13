export type DocumentThumbnail = {
  jpeg: string;
  height: number;
  width: number;
};

export type Document = {
  url: string;
  mediaKey: string | Uint8Array;
  mimeType: string;
  fileName: string;
  fileSize: number;
  contactVcard: boolean;
  thumbnail?: DocumentThumbnail;
  pageCount?: number;
};
