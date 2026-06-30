import type {
  LocalSecuritySettings,
  LocalSecuritySettingsStore
} from "@/domain/security/LocalSecurity";
import type { DatabaseProvider } from "@/data/storage/Database";
import { toStorageAppError } from "@/core/errors/AppError";

const SETTINGS_KEY = "local_security_settings_v1";
const DEFAULT_SETTINGS: LocalSecuritySettings = {
  enabled: false,
  backgroundTimeoutMs: 60_000
};

export class SQLiteLocalSecuritySettingsStore implements LocalSecuritySettingsStore {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async get(): Promise<LocalSecuritySettings> {
    try {
      const database = await this.databaseProvider();
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_metadata WHERE key = ?",
        [SETTINGS_KEY]
      );
      if (!row) return DEFAULT_SETTINGS;
      const value: unknown = JSON.parse(row.value);
      if (!value || typeof value !== "object") return DEFAULT_SETTINGS;
      const settings = value as Partial<LocalSecuritySettings>;
      return {
        enabled: settings.enabled === true,
        backgroundTimeoutMs:
          typeof settings.backgroundTimeoutMs === "number" && settings.backgroundTimeoutMs >= 0
            ? settings.backgroundTimeoutMs
            : DEFAULT_SETTINGS.backgroundTimeoutMs
      };
    } catch (error) {
      throw toStorageAppError(error, "Local security settings could not be loaded.");
    }
  }

  async set(settings: LocalSecuritySettings): Promise<void> {
    try {
      const database = await this.databaseProvider();
      await database.runAsync(
        "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)",
        [SETTINGS_KEY, JSON.stringify(settings), new Date().toISOString()]
      );
    } catch (error) {
      throw toStorageAppError(error, "Local security settings could not be saved.");
    }
  }
}
