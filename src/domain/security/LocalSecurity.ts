export type AuthenticationErrorReason =
  | "unavailable"
  | "notEnrolled"
  | "canceled"
  | "failed"
  | "lockout"
  | "systemCanceled";

export type AuthenticationResult =
  | { status: "authenticated" }
  | { status: "failed"; reason: AuthenticationErrorReason; retryable: boolean };

export type LocalAuthService = {
  getAvailability(): Promise<{ available: boolean; enrolled: boolean }>;
  authenticate(reason: "unlock" | "sensitiveAction"): Promise<AuthenticationResult>;
};

export type LocalSecuritySettings = {
  enabled: boolean;
  backgroundTimeoutMs: number;
};

export type LocalSecuritySettingsStore = {
  get(): Promise<LocalSecuritySettings>;
  set(settings: LocalSecuritySettings): Promise<void>;
};

export type AccessGateState =
  | { status: "loading" }
  | { status: "unlocked"; backgroundedAt?: number }
  | { status: "locked"; reason: "launch" | "timeout" | "manual" | "authenticationFailed"; pendingPath?: string }
  | { status: "authenticating"; reason: "launch" | "timeout" | "manual"; pendingPath?: string };

export type AccessGateEvent =
  | { type: "settingsLoaded"; enabled: boolean }
  | { type: "background"; now: number }
  | { type: "resume"; now: number; timeoutMs: number }
  | { type: "deepLink"; path: string }
  | { type: "requestUnlock" }
  | { type: "authenticationSucceeded" }
  | { type: "authenticationFailed"; reason: AuthenticationErrorReason }
  | { type: "lock" };

export function reduceAccessGate(state: AccessGateState, event: AccessGateEvent): AccessGateState {
  switch (event.type) {
    case "settingsLoaded":
      return event.enabled ? { status: "locked", reason: "launch" } : { status: "unlocked" };
    case "background":
      return state.status === "unlocked" ? { status: "unlocked", backgroundedAt: event.now } : state;
    case "resume":
      if (
        state.status === "unlocked" &&
        state.backgroundedAt !== undefined &&
        event.now - state.backgroundedAt >= event.timeoutMs
      ) {
        return { status: "locked", reason: "timeout" };
      }
      return state.status === "unlocked" ? { status: "unlocked" } : state;
    case "deepLink":
      if (state.status === "locked" || state.status === "authenticating") {
        return { ...state, pendingPath: event.path };
      }
      return state;
    case "requestUnlock":
      if (state.status !== "locked") return state;
      return {
        status: "authenticating",
        reason: state.reason === "authenticationFailed" ? "manual" : state.reason,
        pendingPath: state.pendingPath
      };
    case "authenticationSucceeded":
      return { status: "unlocked" };
    case "authenticationFailed":
      if (state.status !== "authenticating") return state;
      return {
        status: "locked",
        reason: "authenticationFailed",
        pendingPath: state.pendingPath
      };
    case "lock":
      return { status: "locked", reason: "manual" };
  }
}
