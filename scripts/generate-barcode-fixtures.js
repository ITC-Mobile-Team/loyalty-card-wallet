const fs = require("node:fs");
const path = require("node:path");

const bwipjs = require("bwip-js");
const { PNG } = require("pngjs");

const outputDirectory = path.resolve("test/fixtures/barcodes");
const manifestPath = path.join(outputDirectory, "manifest.json");

const formats = [
  { bcid: "code128", format: "code128", value: "LCW1280001" },
  { bcid: "code39", format: "code39", value: "LCW390001" },
  { bcid: "ean13", format: "ean13", value: "4006381333931" },
  { bcid: "ean8", format: "ean8", value: "96385074" },
  { bcid: "upca", format: "upca", value: "036000291452" },
  { bcid: "upce", format: "upce", value: "04252614" },
  { bcid: "itf14", format: "itf", value: "12345678901231" },
  { bcid: "qrcode", format: "qr", value: "loyalty://synthetic/lcw-qr-1" }
];

const variants = ["clear", "rotation", "scale", "low_contrast", "blur", "glare"];

function createCanvas(width, height, color = 255) {
  const png = new PNG({ width, height });

  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = color;
    png.data[offset + 1] = color;
    png.data[offset + 2] = color;
    png.data[offset + 3] = 255;
  }

  return png;
}

function copyPixel(source, sourceX, sourceY, target, targetX, targetY) {
  if (
    sourceX < 0 ||
    sourceY < 0 ||
    sourceX >= source.width ||
    sourceY >= source.height ||
    targetX < 0 ||
    targetY < 0 ||
    targetX >= target.width ||
    targetY >= target.height
  ) {
    return;
  }

  const sourceOffset = (sourceY * source.width + sourceX) * 4;
  const targetOffset = (targetY * target.width + targetX) * 4;
  source.data.copy(target.data, targetOffset, sourceOffset, sourceOffset + 4);
}

function centerOnCanvas(source, width, height) {
  const target = createCanvas(width, height);
  const left = Math.floor((width - source.width) / 2);
  const top = Math.floor((height - source.height) / 2);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      copyPixel(source, x, y, target, left + x, top + y);
    }
  }

  return target;
}

function rotateClockwise(source) {
  const rotated = createCanvas(source.height, source.width);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      copyPixel(source, x, y, rotated, source.height - 1 - y, x);
    }
  }

  return centerOnCanvas(rotated, Math.max(640, rotated.width + 80), Math.max(640, rotated.height + 80));
}

function scaleDown(source, ratio) {
  const scaledWidth = Math.max(1, Math.round(source.width * ratio));
  const scaledHeight = Math.max(1, Math.round(source.height * ratio));
  const scaled = createCanvas(scaledWidth, scaledHeight);

  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      copyPixel(
        source,
        Math.min(source.width - 1, Math.floor(x / ratio)),
        Math.min(source.height - 1, Math.floor(y / ratio)),
        scaled,
        x,
        y
      );
    }
  }

  return centerOnCanvas(scaled, Math.max(800, source.width + 160), Math.max(520, source.height + 160));
}

function adjustContrast(source, black, white) {
  const target = PNG.sync.read(PNG.sync.write(source));

  for (let offset = 0; offset < target.data.length; offset += 4) {
    const value = target.data[offset];
    const adjusted = Math.round(black + (value / 255) * (white - black));
    target.data[offset] = adjusted;
    target.data[offset + 1] = adjusted;
    target.data[offset + 2] = adjusted;
  }

  return target;
}

function blur(source) {
  const target = createCanvas(source.width, source.height);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      let total = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const sampleX = x + dx;
          const sampleY = y + dy;

          if (sampleX >= 0 && sampleY >= 0 && sampleX < source.width && sampleY < source.height) {
            total += source.data[(sampleY * source.width + sampleX) * 4];
            count += 1;
          }
        }
      }

      const value = Math.round(total / count);
      const offset = (y * target.width + x) * 4;
      target.data[offset] = value;
      target.data[offset + 1] = value;
      target.data[offset + 2] = value;
      target.data[offset + 3] = 255;
    }
  }

  return target;
}

function addGlare(source) {
  const target = PNG.sync.read(PNG.sync.write(source));
  const centerX = Math.floor(target.width * 0.68);
  const stripeWidth = Math.max(4, Math.floor(target.width * 0.025));

  for (let y = Math.floor(target.height * 0.15); y < Math.floor(target.height * 0.85); y += 1) {
    for (let x = centerX - stripeWidth; x <= centerX + stripeWidth; x += 1) {
      if (x < 0 || x >= target.width) continue;
      const offset = (y * target.width + x) * 4;
      const alpha = 0.55;
      target.data[offset] = Math.round(target.data[offset] * (1 - alpha) + 255 * alpha);
      target.data[offset + 1] = Math.round(target.data[offset + 1] * (1 - alpha) + 255 * alpha);
      target.data[offset + 2] = Math.round(target.data[offset + 2] * (1 - alpha) + 255 * alpha);
    }
  }

  return target;
}

function applyVariant(source, variant) {
  switch (variant) {
    case "rotation":
      return rotateClockwise(source);
    case "scale":
      return scaleDown(source, 0.72);
    case "low_contrast":
      return adjustContrast(source, 58, 220);
    case "blur":
      return blur(source);
    case "glare":
      return addGlare(source);
    default:
      return source;
  }
}

async function renderBarcode({ bcid, value }) {
  const options = {
    bcid,
    text: value,
    scale: bcid === "qrcode" ? 8 : 4,
    includetext: false,
    padding: 24,
    backgroundcolor: "FFFFFF"
  };

  if (bcid !== "qrcode") {
    options.height = 28;
  }

  return PNG.sync.read(
    await bwipjs.toBuffer(options)
  );
}

const eanL = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const eanG = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const eanR = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const eanParity = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function renderUncheckedEan13(value) {
  const digits = [...value].map(Number);
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (eanParity[digits[0]][index] === "L" ? eanL[digit] : eanG[digit]))
    .join("");
  const right = digits.slice(7).map((digit) => eanR[digit]).join("");
  const bits = `101${left}01010${right}101`;
  const moduleWidth = 4;
  const quietModules = 16;
  const height = 180;
  const png = createCanvas((bits.length + quietModules * 2) * moduleWidth, height);

  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] !== "1") continue;

    for (let x = 0; x < moduleWidth; x += 1) {
      for (let y = 24; y < height - 24; y += 1) {
        const offset = (y * png.width + (quietModules + index) * moduleWidth + x) * 4;
        png.data[offset] = 0;
        png.data[offset + 1] = 0;
        png.data[offset + 2] = 0;
      }
    }
  }

  return png;
}

function createNoise() {
  const png = createCanvas(720, 420);
  let state = 0x1c0ffee;

  for (let offset = 0; offset < png.data.length; offset += 4) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const value = 96 + (state % 128);
    png.data[offset] = value;
    png.data[offset + 1] = value;
    png.data[offset + 2] = value;
  }

  return png;
}

function writeFixture(fileName, png) {
  fs.writeFileSync(path.join(outputDirectory, fileName), PNG.sync.write(png));
}

async function main() {
  fs.rmSync(outputDirectory, { force: true, recursive: true });
  fs.mkdirSync(outputDirectory, { recursive: true });

  const fixtures = [];

  for (const format of formats) {
    const source = await renderBarcode(format);

    for (const variant of variants) {
      const id = `${format.format}-${variant}`;
      const file = `${id}.png`;
      writeFixture(file, applyVariant(PNG.sync.read(PNG.sync.write(source)), variant));
      fixtures.push({
        expected: [{ format: format.format, value: format.value }],
        file,
        id,
        kind: "positive",
        transformations: variant === "clear" ? [] : [variant]
      });
    }
  }

  const invalidEanFile = "ean13-invalid-checksum.png";
  writeFixture(invalidEanFile, renderUncheckedEan13("4006381333932"));
  fixtures.push({
    expected: [],
    file: invalidEanFile,
    id: "ean13-invalid-checksum",
    kind: "negative",
    transformations: ["invalid_checksum"]
  });

  const blankFile = "unreadable-blank.png";
  writeFixture(blankFile, createCanvas(720, 420));
  fixtures.push({
    expected: [],
    file: blankFile,
    id: "unreadable-blank",
    kind: "negative",
    transformations: ["unreadable"]
  });

  const noiseFile = "unreadable-noise.png";
  writeFixture(noiseFile, createNoise());
  fixtures.push({
    expected: [],
    file: noiseFile,
    id: "unreadable-noise",
    kind: "negative",
    transformations: ["unreadable"]
  });

  const croppedSource = await renderBarcode(formats[0]);
  const cropped = new PNG({
    width: Math.floor(croppedSource.width * 0.55),
    height: croppedSource.height
  });
  PNG.bitblt(
    croppedSource,
    cropped,
    Math.floor(croppedSource.width * 0.2),
    0,
    cropped.width,
    cropped.height,
    0,
    0
  );
  const croppedFile = "unreadable-cropped.png";
  writeFixture(croppedFile, cropped);
  fixtures.push({
    expected: [],
    file: croppedFile,
    id: "unreadable-cropped",
    kind: "negative",
    transformations: ["crop", "unreadable"]
  });

  const journey = [
    ...fixtures.filter((fixture) => fixture.kind === "positive").slice(0, 48),
    fixtures.find((fixture) => fixture.id === "unreadable-blank"),
    fixtures.find((fixture) => fixture.id === "ean13-invalid-checksum")
  ].map((fixture) => fixture.id);

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        generatedBy: "scripts/generate-barcode-fixtures.js",
        journey50: journey,
        fixtures
      },
      null,
      2
    )}\n`
  );

  console.log(`Generated ${fixtures.length} privacy-safe barcode fixtures in ${outputDirectory}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
