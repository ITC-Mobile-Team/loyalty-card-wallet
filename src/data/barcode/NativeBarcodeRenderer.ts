import { isAppError, type AppError } from "../../core/errors/AppError";
import type {
  BarcodeBar,
  BarcodeRenderInput,
  BarcodeRenderer,
  RenderedBarcode
} from "../../domain/barcode/BarcodeRenderer";
import { validateBarcodeValue } from "../../domain/barcode/BarcodeValidation";
import type { BarcodeFormat } from "../../domain/cards/Card";

const code128Patterns = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
] as const;

const code39Patterns: Record<string, string> = {
  "0": "nnnwwnwnn",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn"
};

const eanLPatterns = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"] as const;
const eanGPatterns = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"] as const;
const eanRPatterns = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"] as const;
const ean13Parity = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"] as const;
const upcEParityByNumberSystem: Record<string, readonly string[]> = {
  "0": ["GGGLLL", "GGLGLL", "GGLLGL", "GLLGGL", "LGGGLL", "LLGGGL", "LLLGGG", "LGLGGL", "LGLLGG", "LLGLGG"],
  "1": ["LLLGGG", "LLGLGG", "LLGGLG", "LGLLGG", "GLLLGG", "GGLLLG", "GGGLLL", "GLGLGL", "GLGLLG", "GGLGLG"]
};

const supportedFormats = new Set<BarcodeFormat>(["code128", "code39", "ean13", "ean8", "upca", "upce"]);

export class NativeBarcodeRenderer implements BarcodeRenderer {
  canRender(format: BarcodeFormat): boolean {
    return supportedFormats.has(format);
  }

  async render(input: BarcodeRenderInput): Promise<RenderedBarcode> {
    try {
      if (!this.canRender(input.format)) {
        throw validationError("barcodeFormat", `${input.format.toUpperCase()} barcode rendering is not supported in this phase.`);
      }

      const validation = validateBarcodeValue(input.format, input.value);

      if (isAppError(validation)) {
        throw validation;
      }

      const modules = encodeBarcode(input.format, validation.normalizedValue);
      const quietZoneModules = getQuietZoneModules(input.format);
      const quietModules = [
        ...Array.from({ length: quietZoneModules }, () => false),
        ...modules,
        ...Array.from({ length: quietZoneModules }, () => false)
      ];

      return {
        bars: modulesToBars(quietModules),
        displayValue: validation.displayValue,
        format: input.format,
        moduleCount: quietModules.length,
        normalizedValue: validation.normalizedValue,
        quietZoneModules,
        supportsRotation: true
      };
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }

      throw {
        kind: "unknown",
        message: "Barcode rendering failed."
      } satisfies AppError;
    }
  }
}

function encodeBarcode(format: BarcodeFormat, value: string): boolean[] {
  switch (format) {
    case "code128":
      return encodeCode128(value);
    case "code39":
      return encodeCode39(value);
    case "ean13":
      return encodeEan13(value);
    case "ean8":
      return encodeEan8(value);
    case "upca":
      return encodeEan13(`0${value}`);
    case "upce":
      return encodeUpcE(value);
    case "itf":
    case "qr":
      throw validationError("barcodeFormat", `${format.toUpperCase()} barcode rendering is not supported in this phase.`);
  }
}

function encodeCode128(value: string): boolean[] {
  const startCodeB = 104;
  const values = Array.from(value, (char) => char.charCodeAt(0) - 32);
  const checksum = values.reduce((sum, code, index) => sum + code * (index + 1), startCodeB) % 103;
  const sequence = [startCodeB, ...values, checksum, 106];

  return sequence.flatMap((code) => widthsToModules(code128Patterns[code]));
}

function encodeCode39(value: string): boolean[] {
  const framed = `*${value}*`;
  const modules: boolean[] = [];

  for (const [index, char] of Array.from(framed).entries()) {
    const pattern = code39Patterns[char];

    if (!pattern) {
      throw validationError("cardNumber", "Code 39 contains an unsupported character.");
    }

    pattern.split("").forEach((widthToken, elementIndex) => {
      const width = widthToken === "w" ? 3 : 1;
      const isBar = elementIndex % 2 === 0;
      modules.push(...Array.from({ length: width }, () => isBar));
    });

    if (index < framed.length - 1) {
      modules.push(false);
    }
  }

  return modules;
}

function encodeEan13(value: string): boolean[] {
  const digits = value.split("").map(Number);
  const parity = ean13Parity[digits[0]];
  const modules = patternToModules("101");

  for (let index = 1; index <= 6; index += 1) {
    modules.push(...patternToModules(parity[index - 1] === "L" ? eanLPatterns[digits[index]] : eanGPatterns[digits[index]]));
  }

  modules.push(...patternToModules("01010"));

  for (let index = 7; index <= 12; index += 1) {
    modules.push(...patternToModules(eanRPatterns[digits[index]]));
  }

  modules.push(...patternToModules("101"));
  return modules;
}

function encodeEan8(value: string): boolean[] {
  const digits = value.split("").map(Number);
  const modules = patternToModules("101");

  for (let index = 0; index <= 3; index += 1) {
    modules.push(...patternToModules(eanLPatterns[digits[index]]));
  }

  modules.push(...patternToModules("01010"));

  for (let index = 4; index <= 7; index += 1) {
    modules.push(...patternToModules(eanRPatterns[digits[index]]));
  }

  modules.push(...patternToModules("101"));
  return modules;
}

function encodeUpcE(value: string): boolean[] {
  const numberSystem = value[0];
  const payload = value.slice(1, 7).split("").map(Number);
  const checkDigit = Number(value[7]);
  const parity = upcEParityByNumberSystem[numberSystem][checkDigit];
  const modules = patternToModules("101");

  payload.forEach((digit, index) => {
    modules.push(...patternToModules(parity[index] === "L" ? eanLPatterns[digit] : eanGPatterns[digit]));
  });

  modules.push(...patternToModules("010101"));
  return modules;
}

function widthsToModules(widths: string): boolean[] {
  const modules: boolean[] = [];

  widths.split("").forEach((width, index) => {
    modules.push(...Array.from({ length: Number(width) }, () => index % 2 === 0));
  });

  return modules;
}

function patternToModules(pattern: string): boolean[] {
  return pattern.split("").map((module) => module === "1");
}

function modulesToBars(modules: readonly boolean[]): BarcodeBar[] {
  const bars: BarcodeBar[] = [];
  let index = 0;

  while (index < modules.length) {
    if (!modules[index]) {
      index += 1;
      continue;
    }

    const start = index;

    while (modules[index]) {
      index += 1;
    }

    bars.push({ x: start, width: index - start });
  }

  return bars;
}

function getQuietZoneModules(format: BarcodeFormat): number {
  if (format === "upce") {
    return 9;
  }

  return 10;
}

function validationError(field: string, message: string): AppError {
  return {
    kind: "validation",
    field,
    message
  };
}
