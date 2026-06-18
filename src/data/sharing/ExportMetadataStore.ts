import type { ExportBundleSummary } from "../../domain/sharing/SharingPorts";

export type ExportMetadataStore = {
  getLastExportSummary(): Promise<ExportBundleSummary | null>;
  setLastExportSummary(summary: ExportBundleSummary): Promise<void>;
};
