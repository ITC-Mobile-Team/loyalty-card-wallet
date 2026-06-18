import assert from "node:assert/strict";
import test from "node:test";

import type {
  ExportBundle,
  ExportCardsOptions,
  ImportBundleOptions,
  ImportBundlePreview,
  ImportBundleResult,
  SharingService
} from "../src/domain/sharing/SharingPorts";
import type { ShareTextInput, TextShareService } from "../src/domain/sharing/TextShareService";
import { decodeCardSharePayload } from "../src/domain/sharing/cardShareLink";
import { shareCardLink } from "../src/features/sharing/shareCardLink";

const bundle: ExportBundle = {
  app: "loyalty-card-wallet",
  formatVersion: 1,
  exportedAt: "2026-06-15T00:00:00.000Z",
  cards: [
    {
      storeName: "Sender Market",
      cardNumber: "9876543210",
      barcodeFormat: "qr"
    }
  ]
};

class FakeSharingService implements SharingService {
  exportOptions: ExportCardsOptions | undefined;

  async getLastExportSummary() {
    return null;
  }

  async exportCards(options?: ExportCardsOptions): Promise<ExportBundle> {
    this.exportOptions = options;
    return bundle;
  }

  async previewImportBundle(_bundle: unknown): Promise<ImportBundlePreview> {
    throw new Error("Not needed.");
  }

  async importBundle(_bundle: unknown, _options: ImportBundleOptions): Promise<ImportBundleResult> {
    throw new Error("Not needed.");
  }
}

class FakeTextShareService implements TextShareService {
  input: ShareTextInput | undefined;

  constructor(private readonly result: boolean) {}

  async shareText(input: ShareTextInput): Promise<boolean> {
    this.input = input;
    return this.result;
  }
}

test("shareCardLink exports one card without images and shares a deep link", async () => {
  const sharingService = new FakeSharingService();
  const textShareService = new FakeTextShareService(true);

  const result = await shareCardLink({
    cardId: "card_1",
    now: () => new Date("2026-06-15T00:00:01.000Z"),
    sharingService,
    textShareService
  });
  const url = new URL(result.url);
  const encodedPayload = url.searchParams.get("payload");

  assert.equal(result.shared, true);
  assert.deepEqual(sharingService.exportOptions, { cardIds: ["card_1"], includeImages: false });
  assert.equal(url.protocol, "loyaltycardwallet:");
  assert.equal(url.hostname, "share");
  assert.equal(url.pathname, "/card");
  assert.ok(encodedPayload);
  assert.equal(textShareService.input?.title, "Share Sender Market");
  assert.match(textShareService.input?.message ?? "", /loyaltycardwallet:\/\/share\/card\?payload=/u);
  assert.equal(decodeCardSharePayload(encodedPayload).bundle.cards[0].storeName, "Sender Market");
});

test("shareCardLink treats native share dismissal as a non-error result", async () => {
  const result = await shareCardLink({
    cardId: "card_1",
    sharingService: new FakeSharingService(),
    textShareService: new FakeTextShareService(false)
  });

  assert.equal(result.shared, false);
});
