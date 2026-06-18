import type { NetworkManager, NetworkStatus } from "./NetworkManager";

export class StaticNetworkManager implements NetworkManager {
  async getStatus(): Promise<NetworkStatus> {
    return {
      isConnected: true,
      isInternetReachable: null
    };
  }
}
