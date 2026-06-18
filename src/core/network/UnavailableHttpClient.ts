import type { HttpClient } from "./HttpClient";

export class UnavailableHttpClient implements HttpClient {
  async request(): Promise<never> {
    throw new Error("No HTTP backend is configured for the MVP foundation.");
  }
}
