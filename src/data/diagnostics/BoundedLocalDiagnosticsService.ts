import type {
  DiagnosticEvent,
  DiagnosticEventInput,
  LocalDiagnosticsService
} from "@/domain/diagnostics/Diagnostics";

const SENSITIVE_KEY = /(card.?number|passphrase|password|secret|key|token|bytes|image|coordinate|latitude|longitude|uri|url|error)/i;
const CARD_NUMBER = /\b(?:\d[ -]?){8,19}\b/g;
const PRECISE_COORDINATE = /-?\d{1,3}\.\d{4,}/g;
const BASE64_LIKE = /\b[A-Za-z0-9+/]{48,}={0,2}\b/g;

export function redactDiagnosticString(value: string): string {
  return value
    .replace(CARD_NUMBER, "[REDACTED_CARD_NUMBER]")
    .replace(PRECISE_COORDINATE, "[REDACTED_COORDINATE]")
    .replace(BASE64_LIKE, "[REDACTED_DATA]")
    .slice(0, 512);
}

function redactValue(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 3) return "[TRUNCATED]";
  if (typeof value === "string") return redactDiagnosticString(value);
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) return "[REDACTED_BYTES]";
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => redactValue(item, key, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 20)
        .map(([childKey, childValue]) => [childKey, redactValue(childValue, childKey, depth + 1)])
    );
  }
  return String(value).slice(0, 128);
}

export class BoundedLocalDiagnosticsService implements LocalDiagnosticsService {
  private events: DiagnosticEvent[] = [];

  constructor(private readonly maxEvents = 200) {}

  record(input: DiagnosticEventInput): void {
    const event: DiagnosticEvent = {
      timestamp: new Date().toISOString(),
      code: redactDiagnosticString(input.code),
      component: redactDiagnosticString(input.component),
      level: input.level,
      metadata: input.metadata ? (redactValue(input.metadata) as Record<string, unknown>) : undefined
    };
    this.events = [...this.events.slice(-(this.maxEvents - 1)), event];
  }

  list(): readonly DiagnosticEvent[] {
    return this.events.map((event) => ({ ...event, metadata: event.metadata ? { ...event.metadata } : undefined }));
  }

  clear(): void {
    this.events = [];
  }

  exportText(): string {
    const body = this.events.map((event) => JSON.stringify(event)).join("\n");
    return `Loyalty Card Wallet local diagnostics\nGenerated: ${new Date().toISOString()}\nEvents: ${this.events.length}\n\n${body}`.slice(
      0,
      128 * 1024
    );
  }
}
