export type DiagnosticLevel = "info" | "warning" | "error";

export type DiagnosticEventInput = {
  code: string;
  component: string;
  level: DiagnosticLevel;
  metadata?: Record<string, unknown>;
};

export type DiagnosticEvent = DiagnosticEventInput & {
  timestamp: string;
};

export type LocalDiagnosticsService = {
  record(event: DiagnosticEventInput): void;
  list(): readonly DiagnosticEvent[];
  clear(): void;
  exportText(): string;
};
