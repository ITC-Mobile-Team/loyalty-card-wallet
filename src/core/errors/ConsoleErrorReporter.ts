import type { AppError, ErrorReporter } from "./AppError";

export class ConsoleErrorReporter implements ErrorReporter {
  report(error: AppError) {
    console.warn("[AppError]", error);
  }
}
