import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  BARCODE_CAPABILITY_REGISTRY,
  canPersistBarcode,
  getBarcodeCapabilities
} from "../src/domain/barcode/BarcodeCapabilities";
import { BARCODE_FORMATS } from "../src/domain/cards/Card";

type BarcodeCorpusManifest = {
  fixtures: {
    expected: { format: string; value: string }[];
    file: string;
    id: string;
    kind: "negative" | "positive";
    transformations: string[];
  }[];
  journey50: string[];
};

const barcodeFixtureDirectory = path.resolve("test/fixtures/barcodes");
const barcodeCorpus = JSON.parse(
  fs.readFileSync(path.join(barcodeFixtureDirectory, "manifest.json"), "utf8")
) as BarcodeCorpusManifest;

test("barcode capability registry covers every domain format exactly once", () => {
  assert.deepEqual(
    BARCODE_CAPABILITY_REGISTRY.map((item) => item.format).sort(),
    [...BARCODE_FORMATS].sort()
  );
});

test("persistable formats are renderable and validatable", () => {
  for (const item of BARCODE_CAPABILITY_REGISTRY) {
    if (item.persistable) {
      assert.equal(item.renderable, true);
      assert.equal(item.validatable, true);
      assert.equal(canPersistBarcode(item.format), true);
    }
  }

  assert.equal(canPersistBarcode("itf"), false);
  assert.equal(canPersistBarcode("qr"), false);
  assert.equal(getBarcodeCapabilities("qr").scannable, true);
});

test("synthetic image corpus covers every scanner format and release-hardening transformation", () => {
  const transformations = new Set(barcodeCorpus.fixtures.flatMap((fixture) => fixture.transformations));
  const formats = new Set(
    barcodeCorpus.fixtures.flatMap((fixture) => fixture.expected.map((expected) => expected.format))
  );

  assert.deepEqual([...formats].sort(), [...BARCODE_FORMATS].sort());
  assert.deepEqual([...transformations].sort(), [
    "blur",
    "crop",
    "glare",
    "invalid_checksum",
    "low_contrast",
    "rotation",
    "scale",
    "unreadable"
  ]);
  assert.equal(barcodeCorpus.journey50.length, 50);
  assert.ok(barcodeCorpus.fixtures.some((fixture) => fixture.kind === "negative"));

  for (const fixture of barcodeCorpus.fixtures) {
    assert.equal(
      fs.existsSync(path.join(barcodeFixtureDirectory, fixture.file)),
      true,
      `Missing executable image fixture ${fixture.file}.`
    );
  }
});
