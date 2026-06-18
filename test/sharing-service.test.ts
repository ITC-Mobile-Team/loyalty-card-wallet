import assert from "node:assert/strict";
import test from "node:test";

import type { LoyaltyCard } from "../src/domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../src/domain/cards/CardRepository";
import type {
  ImageStore,
  SaveImageInput,
  StoredImage,
  StoredImagePayload
} from "../src/domain/images/ImageStore";
import type { ExportBundleSummary } from "../src/domain/sharing/SharingPorts";
import type { ExportMetadataStore } from "../src/data/sharing/ExportMetadataStore";
import { LocalSharingService } from "../src/data/sharing/LocalSharingService";
import type { StorageTransactionRunner } from "../src/data/storage/StorageTransactionRunner";

class FakeCardRepository implements CardRepository {
  cards: LoyaltyCard[];
  createdInputs: CreateCardInput[] = [];

  constructor(cards: LoyaltyCard[] = []) {
    this.cards = [...cards];
  }

  async list(): Promise<LoyaltyCard[]> {
    return [...this.cards];
  }

  async getById(id: string): Promise<LoyaltyCard | null> {
    return this.cards.find((card) => card.id === id) ?? null;
  }

  async create(input: CreateCardInput): Promise<LoyaltyCard> {
    this.createdInputs.push(input);

    const card: LoyaltyCard = {
      id: `card_${this.cards.length + 1}`,
      createdAt: "2026-06-10T00:00:00.000Z",
      updatedAt: "2026-06-10T00:00:00.000Z",
      ...input
    };

    this.cards.push(card);
    return card;
  }

  async update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null> {
    const index = this.cards.findIndex((card) => card.id === id);

    if (index === -1) return null;

    this.cards[index] = { ...this.cards[index], ...input, updatedAt: "2026-06-10T00:00:01.000Z" };
    return this.cards[index];
  }

  async delete(id: string): Promise<void> {
    this.cards = this.cards.filter((card) => card.id !== id);
  }
}

class FakeImageStore implements ImageStore {
  imagesByCard = new Map<string, StoredImage[]>();
  payloads = new Map<string, StoredImagePayload>();
  savedInputs: SaveImageInput[] = [];

  async saveImage(input: SaveImageInput): Promise<StoredImage> {
    this.savedInputs.push(input);

    const metadata: StoredImage = {
      id: `image_${this.savedInputs.length}`,
      cardId: input.cardId,
      role: input.role,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      byteLength: input.data.byteLength,
      dataRef: `private-image:image_${this.savedInputs.length}`,
      createdAt: "2026-06-10T00:00:00.000Z"
    };

    this.imagesByCard.set(input.cardId, [...(this.imagesByCard.get(input.cardId) ?? []), metadata]);
    this.payloads.set(metadata.id, { metadata, data: input.data });
    return metadata;
  }

  async getImage(id: string): Promise<StoredImagePayload | null> {
    return this.payloads.get(id) ?? null;
  }

  async listForCard(cardId: string): Promise<StoredImage[]> {
    return this.imagesByCard.get(cardId) ?? [];
  }

  async deleteImage(id: string): Promise<void> {
    this.payloads.delete(id);
  }

  async deleteUnreferencedPayloads(): Promise<number> {
    return 0;
  }
}

class FailingImageStore extends FakeImageStore {
  async saveImage(_input: SaveImageInput): Promise<StoredImage> {
    throw new Error("Synthetic image save failure.");
  }
}

class FailingCleanupImageStore extends FakeImageStore {
  async deleteUnreferencedPayloads(): Promise<number> {
    throw new Error("Synthetic cleanup failure.");
  }
}

class FakeExportMetadataStore implements ExportMetadataStore {
  summary: ExportBundleSummary | null = null;

  async getLastExportSummary(): Promise<ExportBundleSummary | null> {
    return this.summary;
  }

  async setLastExportSummary(summary: ExportBundleSummary): Promise<void> {
    this.summary = summary;
  }
}

class RecordingTransactionRunner implements StorageTransactionRunner {
  runCount = 0;

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.runCount += 1;
    return task();
  }
}

class SnapshotTransactionRunner implements StorageTransactionRunner {
  constructor(
    private readonly cards: FakeCardRepository,
    private readonly images: FakeImageStore
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    const cardsSnapshot = this.cards.cards.map((card) => ({ ...card }));
    const imageListsSnapshot = new Map(
      [...this.images.imagesByCard.entries()].map(([cardId, images]) => [
        cardId,
        images.map((image) => ({ ...image }))
      ])
    );
    const payloadSnapshot = new Map(
      [...this.images.payloads.entries()].map(([imageId, payload]) => [
        imageId,
        {
          metadata: { ...payload.metadata },
          data: new Uint8Array(payload.data)
        }
      ])
    );
    const savedInputsSnapshot = this.images.savedInputs.map((input) => ({
      ...input,
      data: new Uint8Array(input.data)
    }));

    try {
      return await task();
    } catch (error) {
      this.cards.cards = cardsSnapshot;
      this.images.imagesByCard = imageListsSnapshot;
      this.images.payloads = payloadSnapshot;
      this.images.savedInputs = savedInputsSnapshot;
      throw error;
    }
  }
}

const card: LoyaltyCard = {
  id: "card_1",
  storeName: "Test Market",
  cardNumber: "1234567890",
  barcodeFormat: "code128",
  notes: "Synthetic test card",
  createdAt: "2026-06-10T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z"
};

test("exportCards creates a versioned bundle with private image payload data", async () => {
  const cards = new FakeCardRepository([card]);
  const images = new FakeImageStore();
  const metadataStore = new FakeExportMetadataStore();
  const savedImage = await images.saveImage({
    cardId: card.id,
    role: "primary",
    mimeType: "image/png",
    width: 1,
    height: 1,
    data: new Uint8Array([1, 2, 3])
  });
  await cards.update(card.id, { primaryImageId: savedImage.id });

  const service = new LocalSharingService(cards, images, metadataStore);
  const bundle = await service.exportCards();

  assert.equal(bundle.app, "loyalty-card-wallet");
  assert.equal(bundle.formatVersion, 1);
  assert.equal(bundle.cards.length, 1);
  assert.equal(bundle.cards[0].storeName, "Test Market");
  assert.equal(bundle.cards[0].images?.[0].data, "AQID");
  assert.equal(metadataStore.summary?.cardCount, 1);
});

test("previewImportBundle rejects unsupported future versions", async () => {
  const service = new LocalSharingService(new FakeCardRepository(), new FakeImageStore());

  await assert.rejects(
    () =>
      service.previewImportBundle({
        app: "loyalty-card-wallet",
        formatVersion: 99,
        exportedAt: "2026-06-10T00:00:00.000Z",
        cards: []
      }),
    { kind: "importExport" }
  );
});

test("previewImportBundle reports duplicate card count", async () => {
  const service = new LocalSharingService(new FakeCardRepository([card]), new FakeImageStore());

  const preview = await service.previewImportBundle({
    app: "loyalty-card-wallet",
    formatVersion: 1,
    exportedAt: "2026-06-10T00:00:00.000Z",
    cards: [
      {
        storeName: "test market",
        cardNumber: "1234567890",
        barcodeFormat: "code128"
      },
      {
        storeName: "New Store",
        cardNumber: "555555",
        barcodeFormat: "qr"
      }
    ]
  });

  assert.deepEqual(preview, {
    cardCount: 2,
    duplicateCardCount: 1,
    imageCount: 0,
    formatVersion: 1
  });
});

test("importBundle keeps valid card data and stores imported private images", async () => {
  const cards = new FakeCardRepository();
  const images = new FakeImageStore();
  const service = new LocalSharingService(cards, images);

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Imported Store",
          cardNumber: "555555",
          barcodeFormat: "qr",
          notes: "Synthetic import",
          images: [{ role: "primary", mimeType: "image/webp", data: "BAUG" }]
        }
      ]
    },
    { duplicateStrategy: "keepBoth" }
  );

  assert.deepEqual(result, {
    importedCardCount: 1,
    skippedCardCount: 0,
    failedCardCount: 0,
    importedCardIds: ["card_1"],
    errors: []
  });
  assert.equal(cards.cards[0].storeName, "Imported Store");
  assert.equal(cards.cards[0].primaryImageId, "image_1");
  assert.equal(images.savedInputs[0].mimeType, "image/webp");
  assert.deepEqual([...images.savedInputs[0].data], [4, 5, 6]);
});

test("importBundle wraps every card import in the transaction runner", async () => {
  const transactionRunner = new RecordingTransactionRunner();
  const service = new LocalSharingService(
    new FakeCardRepository(),
    new FakeImageStore(),
    undefined,
    transactionRunner
  );

  await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Imported Store",
          cardNumber: "555555",
          barcodeFormat: "qr"
        },
        {
          storeName: "Second Store",
          cardNumber: "777777",
          barcodeFormat: "code128"
        }
      ]
    },
    { duplicateStrategy: "keepBoth" }
  );

  assert.equal(transactionRunner.runCount, 2);
});

test("importBundle skips duplicate cards when requested", async () => {
  const cards = new FakeCardRepository([card]);
  const service = new LocalSharingService(cards, new FakeImageStore());

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Test Market",
          cardNumber: "1234567890",
          barcodeFormat: "code128"
        }
      ]
    },
    { duplicateStrategy: "skip" }
  );

  assert.deepEqual(result, {
    importedCardCount: 0,
    skippedCardCount: 1,
    failedCardCount: 0,
    errors: []
  });
  assert.equal(cards.cards.length, 1);
});

test("importBundle replaces duplicate cards when requested", async () => {
  const cards = new FakeCardRepository([card]);
  const images = new FakeImageStore();
  const service = new LocalSharingService(cards, images);

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Test Market",
          cardNumber: "1234567890",
          barcodeFormat: "code128",
          notes: "Replacement"
        }
      ]
    },
    { duplicateStrategy: "replace" }
  );

  assert.deepEqual(result, {
    importedCardCount: 1,
    skippedCardCount: 0,
    failedCardCount: 0,
    importedCardIds: ["card_2"],
    errors: []
  });
  assert.equal(cards.cards.length, 1);
  assert.equal(cards.cards[0].notes, "Replacement");
});

test("importBundle keeps original duplicate when replacement import fails", async () => {
  const cards = new FakeCardRepository([card]);
  const service = new LocalSharingService(cards, new FailingImageStore());

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Test Market",
          cardNumber: "1234567890",
          barcodeFormat: "code128",
          notes: "Replacement",
          images: [{ role: "primary", mimeType: "image/png", data: "AQID" }]
        }
      ]
    },
    { duplicateStrategy: "replace" }
  );

  assert.equal(result.importedCardCount, 0);
  assert.equal(result.failedCardCount, 1);
  assert.equal(result.importedCardIds, undefined);
  assert.equal(cards.cards.length, 1);
  assert.equal(cards.cards[0].id, card.id);
  assert.equal(cards.cards[0].notes, card.notes);
});

test("importBundle rolls back replacement delete when transactional cleanup fails", async () => {
  const cards = new FakeCardRepository([card]);
  const images = new FailingCleanupImageStore();
  const transactionRunner = new SnapshotTransactionRunner(cards, images);
  const service = new LocalSharingService(cards, images, undefined, transactionRunner);

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Test Market",
          cardNumber: "1234567890",
          barcodeFormat: "code128",
          notes: "Replacement"
        }
      ]
    },
    { duplicateStrategy: "replace" }
  );

  assert.equal(result.importedCardCount, 0);
  assert.equal(result.failedCardCount, 1);
  assert.equal(cards.cards.length, 1);
  assert.equal(cards.cards[0].id, card.id);
  assert.equal(cards.cards[0].notes, card.notes);
});

test("importBundle keeps duplicate cards when requested", async () => {
  const cards = new FakeCardRepository([card]);
  const service = new LocalSharingService(cards, new FakeImageStore());

  const result = await service.importBundle(
    {
      app: "loyalty-card-wallet",
      formatVersion: 1,
      exportedAt: "2026-06-10T00:00:00.000Z",
      cards: [
        {
          storeName: "Test Market",
          cardNumber: "1234567890",
          barcodeFormat: "code128",
          notes: "Kept copy"
        }
      ]
    },
    { duplicateStrategy: "keepBoth" }
  );

  assert.deepEqual(result, {
    importedCardCount: 1,
    skippedCardCount: 0,
    failedCardCount: 0,
    importedCardIds: ["card_2"],
    errors: []
  });
  assert.equal(cards.cards.length, 2);
  assert.equal(cards.cards[1].notes, "Kept copy");
});
