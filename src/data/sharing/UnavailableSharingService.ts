import type {
  ExportBundle,
  ExportBundleSummary,
  ImportBundleOptions,
  ImportBundlePreview,
  ImportBundleResult,
  SharingService
} from "../../domain/sharing/SharingPorts";

export class UnavailableSharingService implements SharingService {
  async getLastExportSummary(): Promise<ExportBundleSummary | null> {
    return null;
  }

  async exportCards(): Promise<ExportBundle> {
    throw { kind: "importExport", message: "Sharing is not available." };
  }

  async previewImportBundle(): Promise<ImportBundlePreview> {
    throw { kind: "importExport", message: "Sharing is not available." };
  }

  async importBundle(_bundle: unknown, _options: ImportBundleOptions): Promise<ImportBundleResult> {
    throw { kind: "importExport", message: "Sharing is not available." };
  }
}
