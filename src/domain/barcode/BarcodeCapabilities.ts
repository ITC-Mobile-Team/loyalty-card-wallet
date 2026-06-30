import type { BarcodeFormat } from "@/domain/cards/Card";

export type BarcodeCapabilities = {
  format: BarcodeFormat;
  persistable: boolean;
  renderable: boolean;
  scannable: boolean;
  validatable: boolean;
};

const registry: Record<BarcodeFormat, BarcodeCapabilities> = {
  code128: { format: "code128", persistable: true, renderable: true, scannable: true, validatable: true },
  code39: { format: "code39", persistable: true, renderable: true, scannable: true, validatable: true },
  ean13: { format: "ean13", persistable: true, renderable: true, scannable: true, validatable: true },
  ean8: { format: "ean8", persistable: true, renderable: true, scannable: true, validatable: true },
  upca: { format: "upca", persistable: true, renderable: true, scannable: true, validatable: true },
  upce: { format: "upce", persistable: true, renderable: true, scannable: true, validatable: true },
  itf: { format: "itf", persistable: false, renderable: false, scannable: true, validatable: false },
  qr: { format: "qr", persistable: false, renderable: false, scannable: true, validatable: false }
};

export const BARCODE_CAPABILITY_REGISTRY: readonly BarcodeCapabilities[] = Object.values(registry);

export function getBarcodeCapabilities(format: BarcodeFormat): BarcodeCapabilities {
  return registry[format];
}

export function canPersistBarcode(format: BarcodeFormat): boolean {
  const capabilities = getBarcodeCapabilities(format);
  return capabilities.persistable && capabilities.renderable && capabilities.validatable;
}
