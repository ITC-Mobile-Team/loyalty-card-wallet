import type { AppError } from "@/core/errors/AppError";
import type { BarcodeFormat } from "@/domain/cards/Card";

export type ImportSessionStatus = "active" | "completed" | "canceled";
export type ImportDraftStatus = "ready" | "needs_attention" | "duplicate" | "failed" | "imported";

export type ImportSession = {
  createdAt: string;
  id: string;
  status: ImportSessionStatus;
  totalSources: number;
  updatedAt: string;
};

export type ImportDraft = {
  barcodeFormat?: BarcodeFormat;
  cardNumber?: string;
  createdAt: string;
  duplicateCardId?: string;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  importedCardId?: string;
  sessionId: string;
  sourceIndex: number;
  sourceName: string;
  status: ImportDraftStatus;
  storeName?: string;
  updatedAt: string;
};

export type CreateImportDraftInput = Pick<
  ImportDraft,
  | "barcodeFormat"
  | "cardNumber"
  | "duplicateCardId"
  | "errorCode"
  | "errorMessage"
  | "sourceIndex"
  | "sourceName"
  | "status"
  | "storeName"
>;

export type UpdateImportDraftInput = {
  barcodeFormat?: BarcodeFormat;
  cardNumber?: string;
  duplicateCardId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  importedCardId?: string | null;
  status?: ImportDraftStatus;
  storeName?: string;
};

export type ImportCommitResult = {
  draftId: string;
  error?: AppError;
  importedCardId?: string;
  retryable: boolean;
  status: "imported" | "failed" | "skipped";
};

export type ImportSessionRepository = {
  addDraft(sessionId: string, input: CreateImportDraftInput): Promise<ImportDraft>;
  create(totalSources: number): Promise<ImportSession>;
  getActive(): Promise<ImportSession | null>;
  getById(id: string): Promise<ImportSession | null>;
  listDrafts(sessionId: string): Promise<ImportDraft[]>;
  setStatus(id: string, status: ImportSessionStatus): Promise<void>;
  updateDraft(id: string, input: UpdateImportDraftInput): Promise<ImportDraft | null>;
};
