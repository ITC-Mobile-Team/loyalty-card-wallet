import type { ImageBarcodeResult } from "@/core/scanner/ImageBarcodeDecoder";

export function selectBestImageBarcodeResult(
  results: ImageBarcodeResult[]
): ImageBarcodeResult | null {
  if (results.length === 0) {
    return null;
  }

  return [...results].sort((left, right) => {
    const confidenceDelta = (right.confidence ?? 0) - (left.confidence ?? 0);

    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const typeComparison = left.type.localeCompare(right.type);

    if (typeComparison !== 0) {
      return typeComparison;
    }

    return left.data.localeCompare(right.data);
  })[0];
}
