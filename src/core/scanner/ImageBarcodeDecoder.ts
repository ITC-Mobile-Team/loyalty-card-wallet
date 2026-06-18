import type { RawScanResult } from "@/domain/scanner/ScanResult";

export type ImageBarcodeResult = RawScanResult & {
  confidence?: number;
};

export type ImageBarcodeDecoder = {
  decodeImage(uri: string, barcodeTypes: string[]): Promise<ImageBarcodeResult[]>;
  isAvailable(): boolean;
};
