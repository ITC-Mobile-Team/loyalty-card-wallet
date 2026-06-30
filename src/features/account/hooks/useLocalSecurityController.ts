import { useCallback, useEffect, useState } from "react";

import { useDependencies } from "@/core/di/useDependencies";
import { useAccessGate } from "@/core/security/AccessGate";

export function useLocalSecurityController() {
  const { localAuthService, localSecuritySettingsStore, interactionFeedback } = useDependencies();
  const { refreshSettings, lock } = useAccessGate();
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    let mounted = true;
    async function loadSecurity() {
      const [settings, availability] = await Promise.all([
        localSecuritySettingsStore.get(),
        localAuthService.getAvailability()
      ]);
      if (!mounted) return;
      setEnabled(settings.enabled);
      setAvailable(availability.available);
      setEnrolled(availability.enrolled);
    }
    void loadSecurity();
    return () => {
      mounted = false;
    };
  }, [localAuthService, localSecuritySettingsStore]);

  const toggle = useCallback(async () => {
    setBusy(true);
    setMessage(undefined);
    try {
      const availability = await localAuthService.getAvailability();
      if (!availability.available || !availability.enrolled) {
        setMessage("Enroll biometrics or a device credential before enabling app lock.");
        interactionFeedback.warning();
        return;
      }
      const auth = await localAuthService.authenticate("sensitiveAction");
      if (auth.status !== "authenticated") {
        setMessage("Authentication was not completed. Security settings were not changed.");
        interactionFeedback.warning();
        return;
      }
      const next = !enabled;
      await localSecuritySettingsStore.set({ enabled: next, backgroundTimeoutMs: 60_000 });
      setEnabled(next);
      setMessage(next ? "App lock enabled with a 1 minute background timeout." : "App lock disabled.");
      interactionFeedback.success();
      await refreshSettings();
    } catch {
      setMessage("Local security settings could not be updated.");
      interactionFeedback.error();
    } finally {
      setBusy(false);
    }
  }, [
    enabled,
    interactionFeedback,
    localAuthService,
    localSecuritySettingsStore,
    refreshSettings
  ]);

  return { available, busy, enabled, enrolled, lock, message, toggle };
}
