import assert from "node:assert/strict";
import test from "node:test";

import { verifyImageMetadata } from "../src/data/backup/imageMetadata";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

test("restore image validation verifies header, MIME type, and dimensions", () => {
  assert.deepEqual(verifyImageMetadata(png(12, 34), "image/png", { width: 12, height: 34 }), {
    mimeType: "image/png",
    width: 12,
    height: 34
  });
  assert.throws(() => verifyImageMetadata(png(12, 34), "image/jpeg"), {
    kind: "backup",
    reason: "invalidImage"
  });
  assert.throws(() => verifyImageMetadata(png(12, 34), "image/png", { width: 1, height: 1 }), {
    kind: "backup",
    reason: "invalidImage"
  });
  assert.throws(() => verifyImageMetadata(new Uint8Array([1, 2, 3]), "image/png"), {
    kind: "backup",
    reason: "invalidImage"
  });
});
