import { requireOptionalNativeModule } from "expo";

import {
  NativeSharedSnapshotStorage,
  type ExternalSnapshotStorageModule
} from "./NativeSharedSnapshotStorage";

const nativeModule =
  requireOptionalNativeModule<ExternalSnapshotStorageModule>("ExternalSnapshotStorage");

export class ExpoNativeSharedSnapshotStorage extends NativeSharedSnapshotStorage {
  constructor() {
    super(nativeModule);
  }
}
