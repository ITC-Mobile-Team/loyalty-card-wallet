import type { SharedSnapshotStorage } from "../../domain/external-surfaces/ExternalSnapshotPorts";
import { isAppError } from "../../core/errors/AppError";

export type ExternalSnapshotStorageModule = {
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  clear(): Promise<void>;
  notifyChanged(): Promise<void>;
};

export class NativeSharedSnapshotStorage implements SharedSnapshotStorage {
  constructor(private readonly module: ExternalSnapshotStorageModule | null) {}

  isAvailable(): boolean {
    return this.module !== null;
  }

  async read(): Promise<string | null> {
    return this.module ? this.execute(() => this.module!.read()) : null;
  }

  async write(serialized: string): Promise<void> {
    if (!this.module) {
      throw {
        kind: "externalSurface",
        reason: "unsupported",
        message: "External widgets are unavailable.",
        retryable: false
      };
    }
    await this.execute(() => this.module!.write(serialized));
  }

  async clear(): Promise<void> {
    if (this.module) await this.execute(() => this.module!.clear());
  }

  async notifyChanged(): Promise<void> {
    if (this.module) await this.execute(() => this.module!.notifyChanged());
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isAppError(error)) throw error;
      throw {
        kind: "externalSurface",
        reason: "storage",
        message: "External widget storage could not be updated.",
        retryable: true
      };
    }
  }
}
