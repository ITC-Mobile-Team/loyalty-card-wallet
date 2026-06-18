import { bytesToBase64 } from "@/core/encoding/base64";
import type { PickedImage } from "@/domain/images/ImageSelection";
import type { StoredImagePayload } from "@/domain/images/ImageStore";

export function imagePayloadToDataUri(payload: StoredImagePayload): string {
  return `data:${payload.metadata.mimeType};base64,${bytesToBase64(payload.data)}`;
}

export function pickedImageToDataUri(image: PickedImage): string {
  return `data:${image.mimeType};base64,${bytesToBase64(image.data)}`;
}
