export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
};

export type NetworkManager = {
  getStatus(): Promise<NetworkStatus>;
};
