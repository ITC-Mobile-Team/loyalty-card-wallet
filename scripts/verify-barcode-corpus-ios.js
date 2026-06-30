const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (process.platform !== "darwin") {
  console.error("The iOS Vision barcode corpus verifier requires macOS and Xcode command-line tools.");
  process.exit(2);
}

const fixtureDirectory = path.resolve("test/fixtures/barcodes");
const manifestPath = path.join(fixtureDirectory, "manifest.json");
const helperPath = path.resolve(
  "modules/ios-vision-barcode-decoder/ios/VisionBarcodeDecoder.swift"
);
const mainSourcePath = path.resolve("scripts/vision-barcode-corpus-main.swift");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "lcw-barcode-corpus-"));
const temporaryMainPath = path.join(temporaryDirectory, "main.swift");
const executablePath = path.join(temporaryDirectory, "barcode-corpus-verifier");

const formatMap = {
  code128: "code128",
  code39: "code39",
  ean13: "ean13",
  ean8: "ean8",
  itf: "itf",
  itf14: "itf",
  qr: "qr",
  upc_a: "upca",
  upc_e: "upce"
};

function canonicalResult(result) {
  return {
    format: result.format ?? formatMap[result.type] ?? result.type,
    value: (result.value ?? result.data).trim()
  };
}

function resultKey(result) {
  return `${result.format}:${result.value}`;
}

try {
  fs.copyFileSync(mainSourcePath, temporaryMainPath);
  childProcess.execFileSync(
    "xcrun",
    [
      "swiftc",
      "-O",
      helperPath,
      temporaryMainPath,
      "-framework",
      "Vision",
      "-o",
      executablePath
    ],
    { stdio: "inherit" }
  );

  const rawResults = childProcess.execFileSync(
    executablePath,
    [manifestPath, fixtureDirectory],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const resultsById = new Map(
    JSON.parse(rawResults).map((result) => [result.id, result.actual.map(canonicalResult)])
  );
  const formats = [...new Set(manifest.fixtures.flatMap((fixture) => fixture.expected.map((item) => item.format)))];
  const metrics = Object.fromEntries(
    formats.map((format) => [
      format,
      { expected: 0, falseNegative: 0, falsePositive: 0, truePositive: 0 }
    ])
  );
  const failures = [];

  for (const fixture of manifest.fixtures) {
    const expected = fixture.expected.map(canonicalResult);
    const actual = resultsById.get(fixture.id) ?? [];
    const expectedKeys = new Set(expected.map(resultKey));
    const actualKeys = new Set(actual.map(resultKey));

    for (const item of expected) {
      metrics[item.format].expected += 1;

      if (actualKeys.has(resultKey(item))) {
        metrics[item.format].truePositive += 1;
      } else {
        metrics[item.format].falseNegative += 1;
        failures.push(`${fixture.id}: missed ${resultKey(item)}`);
      }
    }

    for (const item of actual) {
      if (expectedKeys.has(resultKey(item))) continue;

      if (!metrics[item.format]) {
        metrics[item.format] = {
          expected: 0,
          falseNegative: 0,
          falsePositive: 0,
          truePositive: 0
        };
      }

      metrics[item.format].falsePositive += 1;
      failures.push(`${fixture.id}: unexpected ${resultKey(item)}`);
    }
  }

  let meetsThresholds = true;
  const report = Object.fromEntries(
    Object.entries(metrics).map(([format, counts]) => {
      const recall = counts.expected === 0 ? 1 : counts.truePositive / counts.expected;
      const precision =
        counts.truePositive + counts.falsePositive === 0
          ? 1
          : counts.truePositive / (counts.truePositive + counts.falsePositive);

      if (recall < 0.95 || precision < 0.99) {
        meetsThresholds = false;
      }

      return [
        format,
        {
          ...counts,
          precision: Number(precision.toFixed(4)),
          recall: Number(recall.toFixed(4))
        }
      ];
    })
  );

  console.log(
    JSON.stringify(
      {
        decoder: "Apple Vision through modules/ios-vision-barcode-decoder/ios/VisionBarcodeDecoder.swift",
        fixtureCount: manifest.fixtures.length,
        meetsThresholds,
        metrics: report,
        failures
      },
      null,
      2
    )
  );

  if (!meetsThresholds) {
    process.exitCode = 1;
  }
} finally {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}
