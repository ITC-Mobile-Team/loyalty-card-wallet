import assert from "node:assert/strict";
import test from "node:test";

import { EncryptedBackupContainer } from "../src/data/backup/EncryptedBackupContainer";
import { JsonBundleCodec } from "../src/data/backup/JsonBundleCodec";
import { LocalBackupService } from "../src/data/backup/LocalBackupService";
import {
  BACKUP_LIMITS,
  backupError,
  type BackupByteWriter,
  type BackupCrypto,
  type BackupDocumentDestination,
  type BackupDocumentProvider,
  type BackupDocumentSource
} from "../src/domain/backup/Backup";
import type { LoyaltyCard } from "../src/domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../src/domain/cards/CardRepository";
import type { ImageStore, SaveImageInput, StoredImage, StoredImagePayload } from "../src/domain/images/ImageStore";

class Cards implements CardRepository {
  created = 0;
  constructor(public cards: LoyaltyCard[] = []) {}
  async list() { return [...this.cards]; }
  async getById(id: string) { return this.cards.find((card) => card.id === id) ?? null; }
  async create(input: CreateCardInput) {
    this.created += 1;
    const card: LoyaltyCard = {
      id: `created_${this.created}`,
      createdAt: "2026-06-24T00:00:00.000Z",
      updatedAt: "2026-06-24T00:00:00.000Z",
      ...input
    };
    this.cards.push(card);
    return card;
  }
  async update(id: string, input: UpdateCardInput) {
    const card = this.cards.find((value) => value.id === id);
    if (!card) return null;
    Object.assign(card, input);
    return card;
  }
  async delete(id: string) { this.cards = this.cards.filter((card) => card.id !== id); }
}

class Images implements ImageStore {
  metadata: StoredImage[] = [];
  payloads = new Map<string, StoredImagePayload>();
  async deleteImage() {}
  async deleteUnreferencedPayloads() { return 0; }
  async saveImage(input: SaveImageInput) {
    const metadata: StoredImage = {
      id: `image_${this.metadata.length}`,
      cardId: input.cardId,
      role: input.role,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      byteLength: input.data.byteLength,
      dataRef: `private:${this.metadata.length}`,
      createdAt: "2026-06-24T00:00:00.000Z"
    };
    this.metadata.push(metadata);
    this.payloads.set(metadata.id, { metadata, data: input.data });
    return metadata;
  }
  async getImage(id: string) { return this.payloads.get(id) ?? null; }
  async listForCard(cardId: string) { return this.metadata.filter((image) => image.cardId === cardId); }
}

const unusableCrypto: BackupCrypto = {
  async randomBytes(length) { return new Uint8Array(length); },
  async deriveKey() { return { material: null }; },
  async encryptRecord() { return new Uint8Array(); },
  async decryptRecord() { return new Uint8Array(); }
};

class RejectingContainer extends EncryptedBackupContainer {
  constructor() { super(unusableCrypto, new JsonBundleCodec()); }
  override async read(): Promise<never> {
    throw backupError("wrongPassphrase", "Wrong passphrase.", { retryable: true });
  }
}

function source(): BackupDocumentSource {
  return {
    name: "synthetic.lcwb",
    open: async () => new ReadableStream({ start: (controller) => controller.close() }),
    cleanup: async () => undefined
  };
}

test("provider cancellation and low storage remain typed failures", async () => {
  const canceledProvider: BackupDocumentProvider = {
    async createDestination() { throw new Error("unused"); },
    async pickSource() { throw backupError("canceled", "Canceled.", { retryable: true }); }
  };
  const service = new LocalBackupService(new Cards(), new Images(), new RejectingContainer(), canceledProvider);
  await assert.rejects(() => service.selectAndPreviewRestore("long enough"), {
    kind: "backup",
    reason: "canceled"
  });

  const lowStorageProvider: BackupDocumentProvider = {
    async createDestination() { throw backupError("lowStorage", "Low storage.", { retryable: true }); },
    async pickSource() { return source(); }
  };
  const exportService = new LocalBackupService(new Cards(), new Images(), new RejectingContainer(), lowStorageProvider);
  await assert.rejects(() => exportService.createBackup("long enough"), {
    kind: "backup",
    reason: "lowStorage"
  });
});

test("partial backup output is aborted and cleaned after a write failure", async () => {
  let writes = 0;
  let aborted = false;
  let cleaned = false;
  const writer: BackupByteWriter = {
    async write() {
      writes += 1;
      if (writes === 2) throw new Error("Synthetic disk full.");
    },
    async close() {},
    async abort() { aborted = true; }
  };
  const destination: BackupDocumentDestination = {
    writer,
    async commit() {},
    async cleanup() { cleaned = true; }
  };
  const provider: BackupDocumentProvider = {
    async createDestination() { return destination; },
    async pickSource() { return source(); }
  };
  const container = new EncryptedBackupContainer(unusableCrypto, new JsonBundleCodec());
  const service = new LocalBackupService(new Cards(), new Images(), container, provider);
  await assert.rejects(() => service.createBackup("long enough"), {
    kind: "backup",
    reason: "writeFailed"
  });
  assert.equal(aborted, true);
  assert.equal(cleaned, true);
});

test("oversized wallets and images fail before provider writes", async () => {
  let destinationRequested = false;
  const provider: BackupDocumentProvider = {
    async createDestination() {
      destinationRequested = true;
      throw new Error("must not be called");
    },
    async pickSource() { return source(); }
  };
  const cards = Array.from({ length: BACKUP_LIMITS.maxCards + 1 }, (_, index): LoyaltyCard => ({
    id: `card_${index}`,
    storeName: "Synthetic",
    cardNumber: String(index),
    barcodeFormat: "code128",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z"
  }));
  await assert.rejects(
    () => new LocalBackupService(new Cards(cards), new Images(), new RejectingContainer(), provider).createBackup("long enough"),
    { kind: "backup", reason: "oversizedWallet" }
  );
  assert.equal(destinationRequested, false);

  const oneCard = new Cards([cards[0]]);
  const images = new Images();
  images.metadata.push({
    id: "oversized",
    cardId: cards[0].id,
    role: "primary",
    mimeType: "image/png",
    width: 1,
    height: 1,
    byteLength: BACKUP_LIMITS.maxImageBytes + 1,
    dataRef: "private:oversized",
    createdAt: "2026-06-24T00:00:00.000Z"
  });
  await assert.rejects(
    () => new LocalBackupService(oneCard, images, new RejectingContainer(), provider).createBackup("long enough"),
    { kind: "backup", reason: "oversizedImage" }
  );
});

test("authentication failure causes no restore writes", async () => {
  const cards = new Cards();
  const provider: BackupDocumentProvider = {
    async createDestination() { throw new Error("unused"); },
    async pickSource() { return source(); }
  };
  const service = new LocalBackupService(cards, new Images(), new RejectingContainer(), provider);
  await assert.rejects(
    () =>
      service.restore(
        {
          source: source(),
          preview: {
            envelopeVersion: 1,
            sourcePayloadVersion: 2,
            currentPayloadVersion: 2,
            exportedAt: "2026-06-24T00:00:00.000Z",
            cardCount: 1,
            imageCount: 0,
            totalDecodedBytes: 0
          }
        },
        "wrong passphrase",
        { duplicateStrategy: "keepBoth" }
      ),
    { kind: "backup", reason: "wrongPassphrase" }
  );
  assert.equal(cards.created, 0);
});
