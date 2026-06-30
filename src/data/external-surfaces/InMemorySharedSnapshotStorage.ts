import type { SharedSnapshotStorage } from "../../domain/external-surfaces/ExternalSnapshotPorts";

export class InMemorySharedSnapshotStorage implements SharedSnapshotStorage {
  private value: string | null;
  notificationCount = 0;

  constructor(initialValue: string | null = null) {
    this.value = initialValue;
  }

  isAvailable(): boolean {
    return true;
  }

  async read(): Promise<string | null> {
    return this.value;
  }

  async write(serialized: string): Promise<void> {
    this.value = serialized;
  }

  async clear(): Promise<void> {
    this.value = null;
  }

  async notifyChanged(): Promise<void> {
    this.notificationCount += 1;
  }
}
