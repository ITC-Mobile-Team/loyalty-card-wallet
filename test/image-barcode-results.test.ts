import assert from "node:assert/strict";
import test from "node:test";

import { selectBestImageBarcodeResult } from "../src/data/scanner/imageBarcodeResults";

test("selectBestImageBarcodeResult prefers the highest confidence barcode", () => {
  assert.deepEqual(
    selectBestImageBarcodeResult([
      { confidence: 0.42, data: "111", type: "ean13" },
      { confidence: 0.99, data: "222", type: "ean13" }
    ]),
    { confidence: 0.99, data: "222", type: "ean13" }
  );
});

test("selectBestImageBarcodeResult is deterministic when confidence is equal or missing", () => {
  assert.deepEqual(
    selectBestImageBarcodeResult([
      { data: "222", type: "ean13" },
      { data: "111", type: "code128" },
      { data: "333", type: "ean13" }
    ]),
    { data: "111", type: "code128" }
  );
});

test("selectBestImageBarcodeResult returns null when there are no barcodes", () => {
  assert.equal(selectBestImageBarcodeResult([]), null);
});
