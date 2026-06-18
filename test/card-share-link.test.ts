import assert from "node:assert/strict";
import test from "node:test";

import { stringToBase64Url } from "../src/core/encoding/base64url";
import type { ExportBundle } from "../src/domain/sharing/SharingPorts";
import {
  createCardShareLinkPayload,
  decodeCardSharePayload,
  encodeCardSharePayload,
  MAX_SHARE_LINK_PAYLOAD_LENGTH
} from "../src/domain/sharing/cardShareLink";

const bundle: ExportBundle = {
  app: "loyalty-card-wallet",
  formatVersion: 1,
  exportedAt: "2026-06-15T00:00:00.000Z",
  cards: [
    {
      storeName: "Test Market",
      cardNumber: "1234567890",
      barcodeFormat: "code128",
      notes: "Synthetic shared card"
    }
  ]
};

test("card share codec encodes and decodes a valid one-card payload", () => {
  const payload = createCardShareLinkPayload(bundle, "2026-06-15T00:00:01.000Z");
  const encoded = encodeCardSharePayload(payload);
  const decoded = decodeCardSharePayload(encoded);

  assert.equal(decoded.app, "loyalty-card-wallet");
  assert.equal(decoded.shareKind, "single-card");
  assert.equal(decoded.linkVersion, 1);
  assert.equal(decoded.bundle.cards.length, 1);
  assert.deepEqual(decoded.bundle.cards[0], bundle.cards[0]);
});

test("card share codec rejects malformed base64url payloads", () => {
  assert.throws(() => decodeCardSharePayload("not valid base64"), { kind: "validation" });
});

test("card share codec rejects a wrong app id", () => {
  const payload = createCardShareLinkPayload(bundle, "2026-06-15T00:00:01.000Z");
  const encoded = stringToBase64Url(JSON.stringify({ ...payload, app: "other-app" }));

  assert.throws(() => decodeCardSharePayload(encoded), { kind: "importExport" });
});

test("card share codec rejects unsupported future link versions", () => {
  const payload = createCardShareLinkPayload(bundle, "2026-06-15T00:00:01.000Z");
  const encoded = stringToBase64Url(JSON.stringify({ ...payload, linkVersion: 99 }));

  assert.throws(() => decodeCardSharePayload(encoded), { kind: "importExport" });
});

test("card share codec rejects zero-card bundles", () => {
  assert.throws(
    () =>
      createCardShareLinkPayload(
        {
          ...bundle,
          cards: []
        },
        "2026-06-15T00:00:01.000Z"
      ),
    { kind: "validation" }
  );
});

test("card share codec rejects multi-card bundles", () => {
  assert.throws(
    () =>
      createCardShareLinkPayload(
        {
          ...bundle,
          cards: [...bundle.cards, { ...bundle.cards[0], storeName: "Second Store" }]
        },
        "2026-06-15T00:00:01.000Z"
      ),
    { kind: "validation" }
  );
});

test("card share codec rejects image payloads", () => {
  assert.throws(
    () =>
      createCardShareLinkPayload(
        {
          ...bundle,
          cards: [
            {
              ...bundle.cards[0],
              images: [{ role: "primary", mimeType: "image/png", data: "AQID" }]
            }
          ]
        },
        "2026-06-15T00:00:01.000Z"
      ),
    { kind: "importExport" }
  );
});

test("card share codec rejects oversized encoded payloads", () => {
  const payload = createCardShareLinkPayload(
    {
      ...bundle,
      cards: [
        {
          ...bundle.cards[0],
          notes: "x".repeat(MAX_SHARE_LINK_PAYLOAD_LENGTH)
        }
      ]
    },
    "2026-06-15T00:00:01.000Z"
  );

  assert.throws(() => encodeCardSharePayload(payload), { kind: "importExport" });
  assert.throws(() => decodeCardSharePayload("a".repeat(MAX_SHARE_LINK_PAYLOAD_LENGTH + 1)), {
    kind: "importExport"
  });
});
