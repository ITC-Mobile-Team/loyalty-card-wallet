import { isAppError, toUnknownAppError } from "../../core/errors/AppError";
import type { BulkPhotoScanItem } from "../../core/scanner/ScannerService";
import { canPersistBarcode } from "../../domain/barcode/BarcodeCapabilities";
import type { CardRepository } from "../../domain/cards/CardRepository";
import {
  createCardDuplicateKey,
  type CardQueryRepository
} from "../../domain/cards/CardQueryRepository";
import type {
  ImportCommitResult,
  ImportDraft,
  ImportSession,
  ImportSessionRepository
} from "../../domain/importing/ImportSession";
import { normalizeScanResult } from "../../domain/scanner/ScanResult";

type BulkImportDependencies = {
  cardQueryRepository: CardQueryRepository;
  cardRepository: CardRepository;
  importSessionRepository: ImportSessionRepository;
};

export async function createImportSessionFromScans(
  dependencies: BulkImportDependencies,
  items: readonly BulkPhotoScanItem[]
): Promise<ImportSession> {
  const session = await dependencies.importSessionRepository.create(items.length);

  for (const item of items) {
    if (item.status === "failed" || !item.result) {
      await dependencies.importSessionRepository.addDraft(session.id, {
        errorCode: item.error?.kind ?? "scan_failed",
        errorMessage: item.error?.message ?? "The image could not be scanned.",
        sourceIndex: item.sourceIndex,
        sourceName: item.sourceName,
        status: "failed"
      });
      continue;
    }

    const normalized = normalizeScanResult(item.result);

    if (isAppError(normalized)) {
      await dependencies.importSessionRepository.addDraft(session.id, {
        errorCode: normalized.kind,
        errorMessage: normalized.message,
        sourceIndex: item.sourceIndex,
        sourceName: item.sourceName,
        status: "failed"
      });
      continue;
    }

    const persistable = canPersistBarcode(normalized.barcodeFormat);
    await dependencies.importSessionRepository.addDraft(session.id, {
      barcodeFormat: normalized.barcodeFormat,
      cardNumber: normalized.cardNumber,
      errorCode: persistable ? undefined : "unrenderable_format",
      errorMessage: persistable
        ? undefined
        : `${normalized.barcodeFormat.toUpperCase()} cannot be rendered at checkout yet.`,
      sourceIndex: item.sourceIndex,
      sourceName: item.sourceName,
      status: "needs_attention",
      storeName: ""
    });
  }

  return session;
}

export async function reviewImportDraft(
  dependencies: BulkImportDependencies,
  draft: ImportDraft,
  changes: Pick<ImportDraft, "barcodeFormat" | "cardNumber" | "storeName">
): Promise<ImportDraft | null> {
  const storeName = changes.storeName?.trim() ?? "";
  const cardNumber = changes.cardNumber?.trim() ?? "";
  const format = changes.barcodeFormat;

  if (!format || !canPersistBarcode(format)) {
    return dependencies.importSessionRepository.updateDraft(draft.id, {
      ...changes,
      duplicateCardId: null,
      errorCode: "unrenderable_format",
      errorMessage: format ? `${format.toUpperCase()} cannot be rendered at checkout yet.` : "Choose a barcode format.",
      status: "needs_attention"
    });
  }

  if (!storeName || !cardNumber) {
    return dependencies.importSessionRepository.updateDraft(draft.id, {
      ...changes,
      duplicateCardId: null,
      errorCode: "missing_required_fields",
      errorMessage: "Store name and card number are required.",
      status: "needs_attention"
    });
  }

  const keyInput = { barcodeFormat: format, cardNumber, storeName };
  const duplicates = await dependencies.cardQueryRepository.findDuplicateIds([keyInput]);
  const duplicateCardId = duplicates.get(createCardDuplicateKey(keyInput));

  return dependencies.importSessionRepository.updateDraft(draft.id, {
    ...changes,
    duplicateCardId: duplicateCardId ?? null,
    errorCode: null,
    errorMessage: null,
    status: duplicateCardId ? "duplicate" : "ready"
  });
}

export async function commitImportDrafts(
  dependencies: BulkImportDependencies,
  drafts: readonly ImportDraft[],
  includeDuplicates: boolean
): Promise<ImportCommitResult[]> {
  const results: ImportCommitResult[] = [];

  for (const draft of drafts) {
    if (draft.status === "duplicate" && !includeDuplicates) {
      results.push({ draftId: draft.id, retryable: false, status: "skipped" });
      continue;
    }

    if (
      (draft.status !== "ready" && draft.status !== "duplicate") ||
      !draft.storeName ||
      !draft.cardNumber ||
      !draft.barcodeFormat ||
      !canPersistBarcode(draft.barcodeFormat)
    ) {
      results.push({ draftId: draft.id, retryable: true, status: "skipped" });
      continue;
    }

    try {
      const card = await dependencies.cardRepository.create({
        barcodeFormat: draft.barcodeFormat,
        cardNumber: draft.cardNumber,
        storeName: draft.storeName
      });
      await dependencies.importSessionRepository.updateDraft(draft.id, {
        importedCardId: card.id,
        status: "imported"
      });
      results.push({
        draftId: draft.id,
        importedCardId: card.id,
        retryable: false,
        status: "imported"
      });
    } catch (error) {
      const appError = isAppError(error) ? error : toUnknownAppError(error);
      await dependencies.importSessionRepository.updateDraft(draft.id, {
        errorCode: appError.kind,
        errorMessage: appError.message,
        status: "failed"
      });
      results.push({
        draftId: draft.id,
        error: appError,
        retryable: true,
        status: "failed"
      });
    }
  }

  return results;
}
