import type { AppError } from "@/core/errors/AppError";
import type { BarcodeFormat } from "@/domain/cards/Card";

export type RawScanResult = {
  data: string;
  type: string;
};

export type NormalizedScanResult = {
  barcodeFormat: BarcodeFormat;
  cardNumber: string;
  rawData: string;
  rawType: string;
};

const scannerFormatMap: Record<string, BarcodeFormat | undefined> = {
  code128: "code128",
  code39: "code39",
  ean13: "ean13",
  ean8: "ean8",
  itf: "itf",
  itf14: "itf",
  qr: "qr",
  upc_a: "upca",
  upc_e: "upce",
  upca: "upca",
  upce: "upce",
  vnbarcodesymbologycode128: "code128",
  vnbarcodesymbologycode39: "code39",
  vnbarcodesymbologyean13: "ean13",
  vnbarcodesymbologyean8: "ean8",
  vnbarcodesymbologyi2of5: "itf",
  vnbarcodesymbologyitf14: "itf",
  vnbarcodesymbologyqr: "qr",
  vnbarcodesymbologyupce: "upce"
};

export function normalizeScanResult(result: RawScanResult): NormalizedScanResult | AppError {
  const barcodeFormat = scannerFormatMap[result.type.trim().toLowerCase()];

  if (!barcodeFormat) {
    return {
      kind: "validation",
      field: "barcodeFormat",
      message: "This barcode format is not supported yet."
    };
  }

  const rawData = result.data;
  const cardNumber =
    barcodeFormat === "qr" ? rawData.trim() : rawData.replace(/[\s-]+/g, "").trim();

  if (cardNumber.length === 0) {
    return {
      kind: "validation",
      field: "cardNumber",
      message: "The scanned barcode did not contain a card number."
    };
  }

  return {
    barcodeFormat,
    cardNumber,
    rawData,
    rawType: result.type
  };
}

export type ScanDebounceState = {
  acceptedAtMs: number;
  key: string;
};

export function getScanResultKey(result: RawScanResult): string {
  return `${result.type.trim().toLowerCase()}:${result.data.trim()}`;
}

export function shouldAcceptScanResult(
  result: RawScanResult,
  nowMs: number,
  previous: ScanDebounceState | null,
  debounceMs: number
): { accepted: true; state: ScanDebounceState } | { accepted: false; state: ScanDebounceState | null } {
  const key = getScanResultKey(result);

  if (previous && previous.key === key && nowMs - previous.acceptedAtMs < debounceMs) {
    return { accepted: false, state: previous };
  }

  return {
    accepted: true,
    state: {
      acceptedAtMs: nowMs,
      key
    }
  };
}
