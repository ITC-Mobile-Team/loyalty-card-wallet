import type { LoyaltyCard } from "../cards/Card";

import type {
  ExternalCardSnapshotOutcome,
  ExternalCardSnapshotPayloadV1,
  ExternalSnapshotDocumentOutcome
} from "./ExternalCardSnapshot";

export type SharedSnapshotStorage = {
  isAvailable(): boolean;
  read(): Promise<string | null>;
  write(serialized: string): Promise<void>;
  clear(): Promise<void>;
  notifyChanged(): Promise<void>;
};

export type ExternalSnapshotRepository = {
  isAvailable(): boolean;
  read(now?: Date): Promise<ExternalSnapshotDocumentOutcome>;
  resolve(sourceCardId?: string, now?: Date): Promise<ExternalCardSnapshotOutcome>;
  select(card: LoyaltyCard, now?: Date): Promise<ExternalCardSnapshotPayloadV1>;
  synchronize(card: LoyaltyCard, now?: Date): Promise<ExternalCardSnapshotPayloadV1 | null>;
  revoke(sourceCardId: string, now?: Date): Promise<ExternalCardSnapshotPayloadV1>;
  isSelected(sourceCardId: string, now?: Date): Promise<boolean>;
};
