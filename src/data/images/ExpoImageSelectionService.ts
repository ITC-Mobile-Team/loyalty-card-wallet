import * as ImagePicker from "expo-image-picker";

import { base64ToBytes } from "@/core/encoding/base64";
import type { AppError } from "@/core/errors/AppError";
import type {
  ImagePermissionResult,
  ImagePermissionState,
  ImageSelectionResult,
  ImageSelectionService,
  ImageSource,
  PickedImage
} from "@/domain/images/ImageSelection";
import type { ImageMimeType } from "@/domain/images/ImageStore";

const cardImagePickerOptions = {
  allowsEditing: true,
  allowsMultipleSelection: false,
  aspect: [3, 2] as [number, number],
  base64: true,
  exif: false,
  mediaTypes: "images" as const,
  quality: 0.82
};

function mapPermissionStatus(status: string): ImagePermissionState {
  if (status === "granted" || status === "denied") {
    return status;
  }

  return "undetermined";
}

function mapPermissionResult(response: { canAskAgain?: boolean; status: string }): ImagePermissionResult {
  return {
    canAskAgain: response.canAskAgain ?? false,
    status: mapPermissionStatus(response.status)
  };
}

function permissionName(source: ImageSource): "camera" | "photos" {
  return source === "camera" ? "camera" : "photos";
}

function toPermissionError(source: ImageSource, message: string): AppError {
  return {
    kind: "permission",
    permission: permissionName(source),
    message
  };
}

function normalizeMimeType(asset: ImagePicker.ImagePickerAsset): ImageMimeType {
  const mimeType = asset.mimeType?.toLowerCase();

  if (mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/jpeg") {
    return mimeType;
  }

  if (/\.png($|\?)/i.test(asset.uri)) return "image/png";
  if (/\.webp($|\?)/i.test(asset.uri)) return "image/webp";

  return "image/jpeg";
}

function mapAsset(source: ImageSource, asset: ImagePicker.ImagePickerAsset): PickedImage {
  if (!asset.base64) {
    throw { kind: "unknown", message: "The selected image could not be read." };
  }

  return {
    data: base64ToBytes(asset.base64),
    height: Math.max(1, Math.round(asset.height)),
    mimeType: normalizeMimeType(asset),
    source,
    width: Math.max(1, Math.round(asset.width))
  };
}

export class ExpoImageSelectionService implements ImageSelectionService {
  async requestPermission(source: ImageSource): Promise<ImagePermissionResult> {
    try {
      if (source === "camera") {
        return mapPermissionResult(await ImagePicker.requestCameraPermissionsAsync());
      }

      return mapPermissionResult(await ImagePicker.requestMediaLibraryPermissionsAsync(false));
    } catch {
      throw toPermissionError(source, "Image permission could not be requested.");
    }
  }

  async pickImage(source: ImageSource): Promise<ImageSelectionResult> {
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(cardImagePickerOptions)
        : await ImagePicker.launchImageLibraryAsync(cardImagePickerOptions);

    if (result.canceled || result.assets.length === 0) {
      return { status: "canceled" };
    }

    return {
      image: mapAsset(source, result.assets[0]),
      status: "selected"
    };
  }
}
