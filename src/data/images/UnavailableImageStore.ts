import type { ImageStore, SaveImageInput, StoredImage, StoredImagePayload } from "../../domain/images/ImageStore";

export class UnavailableImageStore implements ImageStore {
  async saveImage(_input: SaveImageInput): Promise<StoredImage> {
    throw { kind: "storage", message: "Image storage is not available." };
  }

  async getImage(): Promise<StoredImagePayload | null> {
    return null;
  }

  async listForCard(): Promise<StoredImage[]> {
    return [];
  }

  async deleteImage(): Promise<void> {}

  async deleteUnreferencedPayloads(): Promise<number> {
    return 0;
  }
}
