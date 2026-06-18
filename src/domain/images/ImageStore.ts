export type ImageRole = "primary" | "additional";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type StoredImage = {
  id: string;
  cardId: string;
  role: ImageRole;
  mimeType: ImageMimeType;
  width: number;
  height: number;
  byteLength: number;
  dataRef: string;
  createdAt: string;
};

export type StoredImagePayload = {
  metadata: StoredImage;
  data: Uint8Array;
};

export type SaveImageInput = {
  cardId: string;
  role: ImageRole;
  mimeType: ImageMimeType;
  width: number;
  height: number;
  data: Uint8Array;
};

export type ImageStore = {
  deleteImage(id: string): Promise<void>;
  deleteUnreferencedPayloads(): Promise<number>;
  saveImage(input: SaveImageInput): Promise<StoredImage>;
  getImage(id: string): Promise<StoredImagePayload | null>;
  listForCard(cardId: string): Promise<StoredImage[]>;
};
