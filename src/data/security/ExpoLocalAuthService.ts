import * as LocalAuthentication from "expo-local-authentication";

import type {
  AuthenticationErrorReason,
  AuthenticationResult,
  LocalAuthService
} from "@/domain/security/LocalSecurity";

function mapReason(error: LocalAuthentication.LocalAuthenticationError): AuthenticationErrorReason {
  switch (error) {
    case "not_available":
    case "passcode_not_set":
      return "unavailable";
    case "not_enrolled":
      return "notEnrolled";
    case "user_cancel":
    case "app_cancel":
    case "user_fallback":
      return "canceled";
    case "lockout":
      return "lockout";
    case "system_cancel":
    case "timeout":
    case "invalid_context":
      return "systemCanceled";
    default:
      return "failed";
  }
}

export class ExpoLocalAuthService implements LocalAuthService {
  async getAvailability(): Promise<{ available: boolean; enrolled: boolean }> {
    const [available, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync()
    ]);
    return { available, enrolled };
  }

  async authenticate(reason: "unlock" | "sensitiveAction"): Promise<AuthenticationResult> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason === "unlock" ? "Unlock Loyalty Card Wallet" : "Confirm encrypted backup",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
      fallbackLabel: "Use device passcode"
    });

    if (result.success) return { status: "authenticated" };
    const mapped = mapReason(result.error);
    return {
      status: "failed",
      reason: mapped,
      retryable: mapped !== "unavailable" && mapped !== "notEnrolled"
    };
  }
}
