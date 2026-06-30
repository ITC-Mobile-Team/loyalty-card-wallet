import type { LocalDiagnosticsService } from "@/domain/diagnostics/Diagnostics";
import type { AppError, ErrorReporter } from "./AppError";

export class DiagnosticsErrorReporter implements ErrorReporter {
  constructor(private readonly diagnostics: LocalDiagnosticsService) {}

  report(error: AppError): void {
    this.diagnostics.record({
      code: `app_error_${error.kind}`,
      component: "app",
      level: "error",
      metadata: {
        reason: "reason" in error ? error.reason : undefined,
        retryable: "retryable" in error ? error.retryable : undefined
      }
    });
  }
}
