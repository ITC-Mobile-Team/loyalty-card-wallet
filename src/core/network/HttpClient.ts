import type { AppError } from "@/core/errors/AppError";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequest = {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

export type HttpResponse<TBody = unknown> = {
  status: number;
  headers: Record<string, string>;
  body: TBody;
};

export type NetworkError = {
  kind: "timeout" | "offline" | "bad-status" | "invalid-json" | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
};

export type HttpClient = {
  request<TBody = unknown>(request: HttpRequest): Promise<HttpResponse<TBody>>;
};

export function networkErrorToAppError(error: NetworkError): AppError {
  return {
    kind: "network",
    message: error.message,
    retryable: error.retryable
  };
}
