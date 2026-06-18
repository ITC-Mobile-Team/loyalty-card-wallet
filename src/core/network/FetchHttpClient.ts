import type { HttpClient, HttpRequest, HttpResponse, NetworkError } from "./HttpClient";

export class FetchHttpClient implements HttpClient {
  async request<TBody = unknown>(request: HttpRequest): Promise<HttpResponse<TBody>> {
    const controller = new AbortController();
    const timeout = request.timeoutMs
      ? setTimeout(() => {
          controller.abort();
        }, request.timeoutMs)
      : null;

    try {
      const response = await fetch(request.url, {
        body: typeof request.body === "string" ? request.body : JSON.stringify(request.body),
        headers: request.headers,
        method: request.method,
        signal: controller.signal
      });

      if (!response.ok) {
        throw makeNetworkError(
          "bad-status",
          `Request failed with status ${response.status}.`,
          response.status,
          response.status === 408 || response.status === 429 || response.status >= 500
        );
      }

      const responseText = await response.text();
      const body = parseJsonBody<TBody>(responseText);

      return {
        body,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status
      };
    } catch (error) {
      if (isNetworkError(error)) {
        throw error;
      }

      if (isAbortError(error)) {
        throw makeNetworkError("timeout", "The request timed out.", undefined, true);
      }

      throw makeNetworkError("unknown", "The network request failed.", undefined, true);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}

function parseJsonBody<TBody>(responseText: string): TBody {
  if (!responseText) {
    return undefined as TBody;
  }

  try {
    return JSON.parse(responseText) as TBody;
  } catch {
    throw makeNetworkError("invalid-json", "The server returned unreadable data.", undefined, true);
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isNetworkError(error: unknown): error is NetworkError {
  return Boolean(error && typeof error === "object" && "kind" in error && "retryable" in error);
}

function makeNetworkError(
  kind: NetworkError["kind"],
  message: string,
  status: number | undefined,
  retryable: boolean
): NetworkError {
  return { kind, message, retryable, status };
}
