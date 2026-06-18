import assert from "node:assert/strict";
import test from "node:test";

import { isAppError } from "../src/core/errors/AppError";
import { NativeBarcodeRenderer } from "../src/data/barcode/NativeBarcodeRenderer";
import { expandUpcEToUpcA, validateBarcodeValue } from "../src/domain/barcode/BarcodeValidation";

test("validateBarcodeValue accepts supported linear formats", () => {
  assert.deepEqual(validateBarcodeValue("code128", "ABC-123"), {
    displayValue: "ABC-123",
    normalizedValue: "ABC-123"
  });
  assert.deepEqual(validateBarcodeValue("code39", "abc 123"), {
    displayValue: "ABC 123",
    normalizedValue: "ABC 123"
  });
  assert.deepEqual(validateBarcodeValue("ean13", "4006381333931"), {
    displayValue: "4006381333931",
    normalizedValue: "4006381333931"
  });
  assert.deepEqual(validateBarcodeValue("ean8", "96385074"), {
    displayValue: "96385074",
    normalizedValue: "96385074"
  });
  assert.deepEqual(validateBarcodeValue("upca", "036000291452"), {
    displayValue: "036000291452",
    normalizedValue: "036000291452"
  });
  assert.deepEqual(validateBarcodeValue("upce", "04252614"), {
    displayValue: "04252614",
    normalizedValue: "04252614"
  });
});

test("validateBarcodeValue rejects invalid EAN and UPC check digits", () => {
  const ean13 = validateBarcodeValue("ean13", "4006381333932");
  const ean8 = validateBarcodeValue("ean8", "96385075");
  const upca = validateBarcodeValue("upca", "036000291453");
  const upce = validateBarcodeValue("upce", "04252615");

  assert.equal(isAppError(ean13), true);
  assert.equal(isAppError(ean8), true);
  assert.equal(isAppError(upca), true);
  assert.equal(isAppError(upce), true);
});

test("expandUpcEToUpcA expands compressed UPC-E payloads for validation", () => {
  assert.equal(expandUpcEToUpcA("04252614"), "042100005264");
});

test("NativeBarcodeRenderer renders Code 128 and Code 39 bars with quiet zones", async () => {
  const renderer = new NativeBarcodeRenderer();

  const code128 = await renderer.render({ format: "code128", value: "ABC-123" });
  assert.equal(code128.format, "code128");
  assert.equal(code128.quietZoneModules, 10);
  assert.equal(code128.bars[0].x, 10);
  assert.equal(code128.supportsRotation, true);

  const code39 = await renderer.render({ format: "code39", value: "abc 123" });
  assert.equal(code39.format, "code39");
  assert.equal(code39.normalizedValue, "ABC 123");
  assert.equal(code39.quietZoneModules, 10);
  assert.equal(code39.bars[0].x, 10);
});

test("NativeBarcodeRenderer renders EAN and UPC formats with expected module counts", async () => {
  const renderer = new NativeBarcodeRenderer();

  const ean13 = await renderer.render({ format: "ean13", value: "4006381333931" });
  const ean8 = await renderer.render({ format: "ean8", value: "96385074" });
  const upca = await renderer.render({ format: "upca", value: "036000291452" });
  const upce = await renderer.render({ format: "upce", value: "04252614" });

  assert.equal(ean13.moduleCount, 115);
  assert.equal(ean8.moduleCount, 87);
  assert.equal(upca.moduleCount, 115);
  assert.equal(upce.moduleCount, 69);
});

test("NativeBarcodeRenderer maps unsupported and invalid values to AppError", async () => {
  const renderer = new NativeBarcodeRenderer();

  await assert.rejects(renderer.render({ format: "qr", value: "loyalty://card/1" }), {
    field: "barcodeFormat",
    kind: "validation"
  });

  await assert.rejects(renderer.render({ format: "ean13", value: "123" }), {
    field: "cardNumber",
    kind: "validation"
  });
});
