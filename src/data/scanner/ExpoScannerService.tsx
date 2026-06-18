import { CameraView, Camera, type BarcodeScanningResult, type BarcodeType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Platform, StyleSheet, View } from "react-native";

import type { AppError } from "@/core/errors/AppError";
import type { ImageBarcodeDecoder, ImageBarcodeResult } from "@/core/scanner/ImageBarcodeDecoder";
import type {
  CameraScannerViewProps,
  PhotoScanResult,
  ScannerPermissionResult,
  ScannerPermissionState,
  ScannerService
} from "@/core/scanner/ScannerService";

import { selectBestImageBarcodeResult } from "./imageBarcodeResults";

const supportedExpoBarcodeTypes: BarcodeType[] = [
  "code128",
  "code39",
  "ean13",
  "ean8",
  "itf14",
  "qr",
  "upc_a",
  "upc_e"
];

function mapPermissionStatus(status: string): ScannerPermissionState {
  if (status === "granted" || status === "denied") {
    return status;
  }

  return "undetermined";
}

function mapPermissionResult(response: { canAskAgain?: boolean; status: string }): ScannerPermissionResult {
  return {
    canAskAgain: response.canAskAgain ?? false,
    status: mapPermissionStatus(response.status)
  };
}

function toPermissionError(permission: "camera" | "photos", message: string): AppError {
  return {
    kind: "permission",
    permission,
    message
  };
}

function toUnknownScannerError(error: unknown, message: string): AppError {
  if (error && typeof error === "object" && "kind" in error) {
    return error as AppError;
  }

  if (error instanceof Error) {
    return { kind: "unknown", message: error.message };
  }

  return { kind: "unknown", message };
}

function mapBarcodeResult(result: BarcodeScanningResult): ImageBarcodeResult {
  return {
    data: result.data,
    type: result.type
  };
}

function ExpoCameraScannerView({ isActive, onError, onScanned, style }: CameraScannerViewProps) {
  return (
    <View style={[styles.cameraContainer, style]}>
      <CameraView
        active={isActive}
        barcodeScannerSettings={{ barcodeTypes: supportedExpoBarcodeTypes }}
        facing="back"
        onBarcodeScanned={isActive ? (result) => onScanned(mapBarcodeResult(result)) : undefined}
        onMountError={(event) =>
          onError({
            kind: "unknown",
            message: event.message || "The camera could not start."
          })
        }
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export class ExpoScannerService implements ScannerService {
  readonly CameraScannerView = ExpoCameraScannerView;

  constructor(private readonly imageBarcodeDecoder: ImageBarcodeDecoder | null = null) {}

  async requestCameraPermission(): Promise<ScannerPermissionResult> {
    try {
      return mapPermissionResult(await Camera.requestCameraPermissionsAsync());
    } catch {
      throw toPermissionError("camera", "Camera permission could not be requested.");
    }
  }

  async requestPhotoPermission(): Promise<ScannerPermissionResult> {
    try {
      return mapPermissionResult(await ImagePicker.requestMediaLibraryPermissionsAsync(false));
    } catch {
      throw toPermissionError("photos", "Photo library permission could not be requested.");
    }
  }

  async scanFromPhotoLibrary(): Promise<PhotoScanResult> {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        allowsMultipleSelection: false,
        mediaTypes: "images",
        quality: 1
      });

      if (pickerResult.canceled || pickerResult.assets.length === 0) {
        return { status: "canceled" };
      }

      const [asset] = pickerResult.assets;
      const scanResults =
        Platform.OS === "ios" && this.imageBarcodeDecoder?.isAvailable()
          ? await this.imageBarcodeDecoder.decodeImage(asset.uri, supportedExpoBarcodeTypes)
          : (await Camera.scanFromURLAsync(asset.uri, supportedExpoBarcodeTypes)).map(mapBarcodeResult);
      const selectedResult = selectBestImageBarcodeResult(scanResults);

      if (!selectedResult) {
        return {
          status: "failed",
          error: {
            kind: "validation",
            field: "cardNumber",
            message:
              Platform.OS === "ios" && !this.imageBarcodeDecoder?.isAvailable()
                ? "Photo barcode scanning on iOS requires the local development build. Use live scan or manual entry."
                : "No readable barcode was found in that photo. Try a straighter, brighter photo, live scan, or manual entry."
          }
        };
      }

      return {
        status: "scanned",
        result: selectedResult
      };
    } catch (error) {
      return {
        status: "failed",
        error: toUnknownScannerError(error, "The selected photo could not be scanned.")
      };
    }
  }
}

const styles = StyleSheet.create({
  cameraContainer: {
    overflow: "hidden"
  }
});
