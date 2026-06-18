export type AppInfo = {
  name: string;
  version: string;
};

export type AppInfoProvider = {
  getAppInfo(): AppInfo;
};
