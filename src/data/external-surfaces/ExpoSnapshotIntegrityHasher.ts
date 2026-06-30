import * as Crypto from "expo-crypto";

import type { ExternalSnapshotIntegrityHasher } from "@/domain/external-surfaces/ExternalCardSnapshot";

export class ExpoSnapshotIntegrityHasher implements ExternalSnapshotIntegrityHasher {
  async sha256(value: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
}
