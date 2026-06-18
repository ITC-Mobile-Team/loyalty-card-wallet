import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

import type { ImageBarcodeDecoder, ImageBarcodeResult } from "@/core/scanner/ImageBarcodeDecoder";

type IosVisionBarcodeDecoderModule = {
  decodeImage(uri: string, barcodeTypes: string[]): Promise<ImageBarcodeResult[]>;
};

const nativeModule =
  Platform.OS === "ios"
    ? requireOptionalNativeModule<IosVisionBarcodeDecoderModule>("IosVisionBarcodeDecoder")
    : null;

export class IosVisionImageBarcodeDecoder implements ImageBarcodeDecoder {
  isAvailable(): boolean {
    return nativeModule !== null;
  }

  async decodeImage(uri: string, barcodeTypes: string[]): Promise<ImageBarcodeResult[]> {
    if (!nativeModule) {
      return [];
    }

    return nativeModule.decodeImage(uri, barcodeTypes);
  }
}
