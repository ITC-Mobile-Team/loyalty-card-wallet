import Constants from "expo-constants";

import type { AppInfo, AppInfoProvider } from "@/domain/account/AppInfo";

export class ExpoAppInfoProvider implements AppInfoProvider {
  getAppInfo(): AppInfo {
    return {
      name: Constants.expoConfig?.name ?? "Loyalty Card Wallet",
      version: Constants.expoConfig?.version ?? "unknown"
    };
  }
}
