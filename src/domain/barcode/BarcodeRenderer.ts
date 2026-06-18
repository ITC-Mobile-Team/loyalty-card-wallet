import type { BarcodeFormat } from "@/domain/cards/Card";

export type BarcodeRenderInput = {
  value: string;
  format: BarcodeFormat;
};

export type BarcodeBar = {
  width: number;
  x: number;
};

export type RenderedBarcode = {
  bars: readonly BarcodeBar[];
  displayValue: string;
  format: BarcodeFormat;
  moduleCount: number;
  normalizedValue: string;
  quietZoneModules: number;
  supportsRotation: boolean;
};

export type BarcodeRenderer = {
  canRender(format: BarcodeFormat): boolean;
  render(input: BarcodeRenderInput): Promise<RenderedBarcode>;
};
