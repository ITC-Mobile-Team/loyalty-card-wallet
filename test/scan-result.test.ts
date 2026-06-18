import assert from "node:assert/strict";
import test from "node:test";

import { isAppError } from "../src/core/errors/AppError";
import {
  normalizeScanResult,
  shouldAcceptScanResult,
  type ScanDebounceState
} from "../src/domain/scanner/ScanResult";

test("normalizeScanResult maps Expo barcode types to supported card formats", () => {
  assert.deepEqual(normalizeScanResult({ data: "12345", type: "code128" }), {
    barcodeFormat: "code128",
    cardNumber: "12345",
    rawData: "12345",
    rawType: "code128"
  });

  assert.deepEqual(normalizeScanResult({ data: "98765", type: "upc_a" }), {
    barcodeFormat: "upca",
    cardNumber: "98765",
    rawData: "98765",
    rawType: "upc_a"
  });
});

test("normalizeScanResult maps Vision barcode aliases to supported card formats", () => {
  assert.deepEqual(normalizeScanResult({ data: "2762001329686", type: "VNBarcodeSymbologyEAN13" }), {
    barcodeFormat: "ean13",
    cardNumber: "2762001329686",
    rawData: "2762001329686",
    rawType: "VNBarcodeSymbologyEAN13"
  });
});

test("normalizeScanResult removes common separators for one-dimensional card numbers", () => {
  const result = normalizeScanResult({ data: " 1234-567 890 ", type: "ean13" });

  if (isAppError(result)) {
    assert.fail(result.message);
  }

  assert.equal(result.cardNumber, "1234567890");
  assert.equal(result.barcodeFormat, "ean13");
});

test("normalizeScanResult preserves QR payload contents except edge whitespace", () => {
  const result = normalizeScanResult({ data: " loyalty://card/123-456 ", type: "qr" });

  if (isAppError(result)) {
    assert.fail(result.message);
  }

  assert.equal(result.cardNumber, "loyalty://card/123-456");
  assert.equal(result.barcodeFormat, "qr");
});

test("normalizeScanResult returns AppError for unsupported barcode types", () => {
  const result = normalizeScanResult({ data: "123", type: "pdf417" });

  assert.equal(isAppError(result), true);
  assert.deepEqual(result, {
    kind: "validation",
    field: "barcodeFormat",
    message: "This barcode format is not supported yet."
  });
});

test("shouldAcceptScanResult suppresses duplicate scan callbacks inside the debounce window", () => {
  let state: ScanDebounceState | null = null;
  const first = shouldAcceptScanResult({ data: "123", type: "code128" }, 1_000, state, 1_500);
  assert.equal(first.accepted, true);
  state = first.state;

  const duplicate = shouldAcceptScanResult({ data: "123", type: "code128" }, 1_400, state, 1_500);
  assert.equal(duplicate.accepted, false);

  const later = shouldAcceptScanResult({ data: "123", type: "code128" }, 2_600, duplicate.state, 1_500);
  assert.equal(later.accepted, true);
});
