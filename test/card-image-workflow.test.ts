import assert from "node:assert/strict";
import test from "node:test";

import type { LoyaltyCard } from "../src/domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../src/domain/cards/CardRepository";
import type { PickedImage } from "../src/domain/images/ImageSelection";
import type {
  ImageStore,
  SaveImageInput,
  StoredImage,
  StoredImagePayload
} from "../src/domain/images/ImageStore";
import {
  attachAdditionalCardImage,
  attachPrimaryCardImage,
  deleteCardAndCleanupImages
} from "../src/features/images/use-cases/cardImageWorkflow";

class FakeCardRepository implements CardRepository {
  cards = new Map<string, LoyaltyCard>();
  updateResult: LoyaltyCard | null | undefined;

  constructor(cards: LoyaltyCard[] = []) {
    cards.forEach((card) => this.cards.set(card.id, card));
  }

  async list(): Promise<LoyaltyCard[]> {
    return [...this.cards.values()];
  }

  async getById(id: string): Promise<LoyaltyCard | null> {
    return this.cards.get(id) ?? null;
  }

  async create(input: CreateCardInput): Promise<LoyaltyCard> {
    const card: LoyaltyCard = {
      id: `card_${this.cards.size + 1}`,
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
      ...input
    };
    this.cards.set(card.id, card);
    return card;
  }

  async update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null> {
    if (this.updateResult !== undefined) {
      return this.updateResult;
    }

    const card = this.cards.get(id);
    if (!card) return null;

    const updated = { ...card, ...input, updatedAt: "2026-06-11T00:00:01.000Z" };
    this.cards.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.cards.delete(id);
  }
}

class FakeImageStore implements ImageStore {
  cleanupCalls = 0;
  deletedImageIds: string[] = [];
  savedInputs: SaveImageInput[] = [];

  async saveImage(input: SaveImageInput): Promise<StoredImage> {
    this.savedInputs.push(input);

    return {
      id: `image_${this.savedInputs.length}`,
      cardId: input.cardId,
      role: input.role,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      byteLength: input.data.byteLength,
      dataRef: `private-image:image_${this.savedInputs.length}`,
      createdAt: "2026-06-11T00:00:00.000Z"
    };
  }

  async getImage(_id: string): Promise<StoredImagePayload | null> {
    return null;
  }

  async listForCard(_cardId: string): Promise<StoredImage[]> {
    return [];
  }

  async deleteImage(id: string): Promise<void> {
    this.deletedImageIds.push(id);
  }

  async deleteUnreferencedPayloads(): Promise<number> {
    this.cleanupCalls += 1;
    return 0;
  }
}

const card: LoyaltyCard = {
  id: "card_1",
  storeName: "Test Market",
  cardNumber: "1234567890",
  barcodeFormat: "code128",
  primaryImageId: "old_primary",
  thumbnailImageId: "old_thumbnail",
  createdAt: "2026-06-11T00:00:00.000Z",
  updatedAt: "2026-06-11T00:00:00.000Z"
};

const pickedImage: PickedImage = {
  data: new Uint8Array([1, 2, 3, 4]),
  height: 800,
  mimeType: "image/jpeg",
  source: "photoLibrary",
  width: 1200
};

test("attachPrimaryCardImage stores a private primary image and aliases it as the MVP thumbnail", async () => {
  const cards = new FakeCardRepository([card]);
  const images = new FakeImageStore();

  const updatedCard = await attachPrimaryCardImage(
    { cardRepository: cards, imageStore: images },
    card.id,
    pickedImage,
    [card.primaryImageId!, card.thumbnailImageId!]
  );

  assert.equal(images.savedInputs[0].role, "primary");
  assert.equal(images.savedInputs[0].mimeType, "image/jpeg");
  assert.deepEqual([...images.savedInputs[0].data], [1, 2, 3, 4]);
  assert.equal(updatedCard?.primaryImageId, "image_1");
  assert.equal(updatedCard?.thumbnailImageId, "image_1");
  assert.deepEqual(images.deletedImageIds.sort(), ["old_primary", "old_thumbnail"]);
  assert.equal(images.cleanupCalls, 1);
});

test("attachPrimaryCardImage deletes the saved payload if the card update fails", async () => {
  const cards = new FakeCardRepository([card]);
  cards.updateResult = null;
  const images = new FakeImageStore();

  const updatedCard = await attachPrimaryCardImage(
    { cardRepository: cards, imageStore: images },
    card.id,
    pickedImage
  );

  assert.equal(updatedCard, null);
  assert.deepEqual(images.deletedImageIds, ["image_1"]);
});

test("attachAdditionalCardImage stores additional images without changing card image references", async () => {
  const images = new FakeImageStore();

  const savedImage = await attachAdditionalCardImage({ imageStore: images }, card.id, pickedImage);

  assert.equal(savedImage.role, "additional");
  assert.equal(images.savedInputs[0].cardId, card.id);
  assert.equal(images.cleanupCalls, 0);
});

test("deleteCardAndCleanupImages removes the card and then cleans orphaned private payloads", async () => {
  const cards = new FakeCardRepository([card]);
  const images = new FakeImageStore();

  await deleteCardAndCleanupImages({ cardRepository: cards, imageStore: images }, card.id);

  assert.equal(await cards.getById(card.id), null);
  assert.equal(images.cleanupCalls, 1);
});
