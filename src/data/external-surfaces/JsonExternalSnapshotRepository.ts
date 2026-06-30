import {
  createEmptyExternalSnapshot,
  decodeExternalSnapshot,
  encodeExternalSnapshot,
  isCardSelected,
  projectSelectedCard,
  resolveExternalCardSnapshot,
  revokeSelectedCard,
  type ExternalCardSnapshotPayloadV1,
  type ExternalSnapshotIntegrityHasher
} from "../../domain/external-surfaces/ExternalCardSnapshot";
import type {
  ExternalSnapshotRepository,
  SharedSnapshotStorage
} from "../../domain/external-surfaces/ExternalSnapshotPorts";
import type { LoyaltyCard } from "../../domain/cards/Card";

export class JsonExternalSnapshotRepository implements ExternalSnapshotRepository {
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: SharedSnapshotStorage,
    private readonly hasher: ExternalSnapshotIntegrityHasher
  ) {}

  isAvailable(): boolean {
    return this.storage.isAvailable();
  }

  async read(now = new Date()) {
    const serialized = await this.storage.read();
    return serialized === null
      ? { status: "missing" as const }
      : decodeExternalSnapshot(serialized, now, this.hasher);
  }

  async resolve(sourceCardId?: string, now = new Date()) {
    return resolveExternalCardSnapshot(await this.read(now), sourceCardId);
  }

  async isSelected(sourceCardId: string, now = new Date()): Promise<boolean> {
    const outcome = await this.read(now);
    return (
      (outcome.status === "ready" || outcome.status === "stale") &&
      isCardSelected(outcome.snapshot, sourceCardId)
    );
  }

  async select(card: LoyaltyCard, now = new Date()): Promise<ExternalCardSnapshotPayloadV1> {
    const snapshot = await this.mutate(now, (current) => projectSelectedCard(current, card, now));
    if (!snapshot) throw new Error("External snapshot selection did not produce a snapshot.");
    return snapshot;
  }

  async synchronize(card: LoyaltyCard, now = new Date()): Promise<ExternalCardSnapshotPayloadV1 | null> {
    return this.mutate(now, (snapshot) =>
      isCardSelected(snapshot, card.id) ? projectSelectedCard(snapshot, card, now) : null
    );
  }

  async revoke(sourceCardId: string, now = new Date()): Promise<ExternalCardSnapshotPayloadV1> {
    const snapshot = await this.mutate(now, (current) => revokeSelectedCard(current, sourceCardId, now));
    if (!snapshot) throw new Error("External snapshot revocation did not produce a snapshot.");
    return snapshot;
  }

  private async mutate(
    now: Date,
    transform: (
      snapshot: ExternalCardSnapshotPayloadV1
    ) => ExternalCardSnapshotPayloadV1 | null
  ): Promise<ExternalCardSnapshotPayloadV1 | null> {
    let result: ExternalCardSnapshotPayloadV1 | null = null;
    const operation = this.mutationQueue.then(async () => {
      const current = await this.read(now);
      const base =
        current.status === "ready" || current.status === "stale"
          ? current.snapshot
          : createEmptyExternalSnapshot(now);
      result = transform(base);
      if (!result) return;
      await this.storage.write(await encodeExternalSnapshot(result, this.hasher));
      await this.storage.notifyChanged();
    });
    this.mutationQueue = operation.then(
      () => undefined,
      () => undefined
    );
    await operation;
    return result;
  }
}
