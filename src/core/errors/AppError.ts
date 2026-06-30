import type { BackupErrorReason } from "@/domain/backup/Backup";
import type { AuthenticationErrorReason } from "@/domain/security/LocalSecurity";

export type ExternalSurfaceErrorReason =
  | "unsupported"
  | "storage"
  | "corrupt"
  | "futureVersion"
  | "authenticationRequired";

export type AppError =
  | { kind: "network"; message: string; retryable: boolean }
  | { kind: "storage"; message: string }
  | { kind: "permission"; permission: "camera" | "location" | "photos"; message: string }
  | { kind: "importExport"; message: string }
  | { kind: "backup"; reason: BackupErrorReason; message: string; retryable: boolean }
  | { kind: "authentication"; reason: AuthenticationErrorReason; message: string; retryable: boolean }
  | { kind: "externalSurface"; reason: ExternalSurfaceErrorReason; message: string; retryable: boolean }
  | { kind: "validation"; field?: string; message: string }
  | { kind: "unknown"; message: string };

export type ErrorReporter = {
  report(error: AppError): void;
};

export function isAppError(error: unknown): error is AppError {
  if (!error || typeof error !== "object" || !("kind" in error)) {
    return false;
  }

  return [
    "network",
    "storage",
    "permission",
    "importExport",
    "backup",
    "authentication",
    "externalSurface",
    "validation",
    "unknown"
  ].includes(String((error as { kind: unknown }).kind));
}

export function toStorageAppError(error: unknown, message = "Local storage operation failed."): AppError {
  if (isAppError(error)) {
    return error;
  }

  return { kind: "storage", message };
}

export function toImportExportAppError(
  error: unknown,
  message = "Import or export operation failed."
): AppError {
  if (isAppError(error)) {
    return error;
  }

  return { kind: "importExport", message };
}

export function toUnknownAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return { kind: "unknown", message: error.message };
  }

  return { kind: "unknown", message: "Something went wrong." };
}
