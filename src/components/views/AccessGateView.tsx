import { StyleSheet, View } from "react-native";
import { LockKeyhole } from "lucide-react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppText } from "@/components/ui/AppText";
import { colors, radius, spacing } from "@/design/tokens";
import type { AuthenticationErrorReason } from "@/domain/security/LocalSecurity";

type AccessGateViewProps = {
  authenticating: boolean;
  failureReason?: AuthenticationErrorReason;
  loading?: boolean;
  onUnlock: () => void;
};

function failureMessage(reason?: AuthenticationErrorReason): string | undefined {
  switch (reason) {
    case "canceled":
      return "Authentication was canceled. Your wallet remains locked.";
    case "lockout":
      return "Authentication is temporarily locked by the operating system. Try again later or use the device fallback.";
    case "notEnrolled":
      return "No biometric or device credential is enrolled. Update device security settings to continue.";
    case "unavailable":
      return "Local authentication is unavailable on this device.";
    case "failed":
    case "systemCanceled":
      return "Authentication did not complete. Try again.";
    default:
      return undefined;
  }
}

export function AccessGateView({
  authenticating,
  failureReason,
  loading = false,
  onUnlock
}: AccessGateViewProps) {
  return (
    <View accessibilityViewIsModal style={styles.overlay}>
      <View style={styles.panel}>
        <LockKeyhole color={colors.text.primary} size={32} />
        <AppText variant="titleLarge">{loading ? "Checking security" : "Wallet locked"}</AppText>
        <AppText color={colors.text.secondary} style={styles.centered}>
          Authenticate to view cards. This app lock does not encrypt the SQLite database at rest.
        </AppText>
        {failureMessage(failureReason) ? (
          <AppText accessibilityLiveRegion="assertive" color={colors.action.danger} style={styles.centered}>
            {failureMessage(failureReason)}
          </AppText>
        ) : null}
        {loading ? null : (
          <AppButton
            disabled={authenticating}
            label={authenticating ? "Authenticating..." : "Unlock"}
            onPress={onUnlock}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    backgroundColor: colors.surface.app,
    justifyContent: "center",
    padding: spacing.xl,
    zIndex: 100
  },
  panel: {
    alignItems: "center",
    backgroundColor: colors.surface.raised,
    borderRadius: radius.field,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.xl,
    width: "100%"
  },
  centered: {
    textAlign: "center"
  }
});
