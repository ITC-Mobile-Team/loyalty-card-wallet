import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import type { AppError } from "@/core/errors/AppError";
import type { RawScanResult } from "@/domain/scanner/ScanResult";

export type ScannerPermissionState = "granted" | "denied" | "undetermined";

export type ScannerPermissionResult = {
  canAskAgain: boolean;
  status: ScannerPermissionState;
};

export type CameraScannerViewProps = {
  isActive: boolean;
  onError: (error: AppError) => void;
  onScanned: (result: RawScanResult) => void;
  style?: StyleProp<ViewStyle>;
};

export type PhotoScanResult =
  | { status: "canceled" }
  | { status: "scanned"; result: RawScanResult }
  | { status: "failed"; error: AppError };

export type BulkPhotoScanItem = {
  error?: AppError;
  result?: RawScanResult;
  sourceIndex: number;
  sourceName: string;
  status: "scanned" | "failed";
};

export type BulkPhotoScanResult =
  | { status: "canceled" }
  | { items: BulkPhotoScanItem[]; status: "scanned" };

export type ScannerService = {
  CameraScannerView: ComponentType<CameraScannerViewProps>;
  requestCameraPermission(): Promise<ScannerPermissionResult>;
  requestPhotoPermission(): Promise<ScannerPermissionResult>;
  scanFromPhotoLibrary(): Promise<PhotoScanResult>;
  scanMultipleFromPhotoLibrary(): Promise<BulkPhotoScanResult>;
};
