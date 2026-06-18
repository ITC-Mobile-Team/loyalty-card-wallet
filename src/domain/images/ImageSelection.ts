import type { ImageMimeType } from "./ImageStore";

export type ImageSource = "camera" | "photoLibrary";

export type ImagePermissionState = "granted" | "denied" | "undetermined";

export type ImagePermissionResult = {
  canAskAgain: boolean;
  status: ImagePermissionState;
};

export type PickedImage = {
  data: Uint8Array;
  height: number;
  mimeType: ImageMimeType;
  source: ImageSource;
  width: number;
};

export type ImageSelectionResult =
  | { status: "canceled" }
  | { image: PickedImage; status: "selected" };

export type ImageSelectionService = {
  pickImage(source: ImageSource): Promise<ImageSelectionResult>;
  requestPermission(source: ImageSource): Promise<ImagePermissionResult>;
};
