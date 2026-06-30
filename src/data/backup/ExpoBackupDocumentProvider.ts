import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  backupError,
  type BackupByteWriter,
  type BackupDocumentDestination,
  type BackupDocumentProvider,
  type BackupDocumentSource
} from "@/domain/backup/Backup";

class ExpoStreamWriter implements BackupByteWriter {
  constructor(private readonly writer: WritableStreamDefaultWriter<Uint8Array>) {}

  write(bytes: Uint8Array): Promise<void> {
    return this.writer.write(bytes);
  }

  close(): Promise<void> {
    return this.writer.close();
  }

  async abort(): Promise<void> {
    await this.writer.abort().catch(() => undefined);
  }
}

function safeDelete(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Cleanup is best effort after the typed provider result has already been determined.
  }
}

export class ExpoBackupDocumentProvider implements BackupDocumentProvider {
  async createDestination(input: {
    suggestedName: string;
    estimatedBytes: number;
  }): Promise<BackupDocumentDestination> {
    if (Paths.availableDiskSpace < input.estimatedBytes * 1.25) {
      throw backupError("lowStorage", "There is not enough temporary storage to create this backup.", {
        retryable: true
      });
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      throw backupError("providerUnavailable", "File sharing is not available on this platform.");
    }

    const file = new File(Paths.cache, input.suggestedName);
    safeDelete(file);
    file.create({ overwrite: true });
    const writer = new ExpoStreamWriter(file.writableStream().getWriter());

    return {
      writer,
      commit: async () => {
        try {
          await Sharing.shareAsync(file.uri, {
            dialogTitle: "Save encrypted wallet backup",
            mimeType: "application/octet-stream",
            UTI: "public.data"
          });
        } catch {
          throw backupError("providerFailure", "The system could not export the backup file.", {
            retryable: true
          });
        }
      },
      cleanup: async () => safeDelete(file)
    };
  }

  async pickSource(): Promise<BackupDocumentSource> {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: ["application/octet-stream", "application/json", "*/*"],
        copyToCacheDirectory: true,
        multiple: false
      });
    } catch {
      throw backupError("providerFailure", "The system document picker could not open.", { retryable: true });
    }

    if (result.canceled || !result.assets[0]) {
      throw backupError("canceled", "Restore file selection was canceled.", { retryable: true });
    }

    const asset = result.assets[0];
    const file = new File(asset.uri);
    return {
      name: asset.name,
      size: asset.size,
      open: async () => file.readableStream(),
      cleanup: async () => {
        if (file.uri.startsWith(Paths.cache.uri)) safeDelete(file);
      }
    };
  }
}
