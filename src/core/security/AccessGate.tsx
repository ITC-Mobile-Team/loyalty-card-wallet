import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type PropsWithChildren
} from "react";
import { AppState, StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import { AccessGateView } from "@/components/views/AccessGateView";
import { useDependencies } from "@/core/di/useDependencies";
import {
  reduceAccessGate,
  type AccessGateState,
  type AuthenticationErrorReason,
  type LocalSecuritySettings
} from "@/domain/security/LocalSecurity";

type AccessGateContextValue = {
  state: AccessGateState;
  settings: LocalSecuritySettings | null;
  refreshSettings(): Promise<void>;
  lock(): void;
};

const AccessGateContext = createContext<AccessGateContextValue | null>(null);

export function AccessGateProvider({ children }: PropsWithChildren) {
  const { localAuthService, localSecuritySettingsStore } = useDependencies();
  const pathname = usePathname();
  const [state, dispatch] = useReducer(reduceAccessGate, { status: "loading" });
  const [settings, setSettings] = useState<LocalSecuritySettings | null>(null);
  const [failureReason, setFailureReason] = useState<AuthenticationErrorReason>();

  const refreshSettings = useCallback(async () => {
    const next = await localSecuritySettingsStore.get();
    setSettings(next);
    dispatch({ type: "settingsLoaded", enabled: next.enabled });
  }, [localSecuritySettingsStore]);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      const next = await localSecuritySettingsStore.get();
      if (!mounted) return;
      setSettings(next);
      dispatch({ type: "settingsLoaded", enabled: next.enabled });
    }
    void loadSettings();
    return () => {
      mounted = false;
    };
  }, [localSecuritySettingsStore]);

  useEffect(() => {
    if (state.status === "locked" || state.status === "authenticating") {
      dispatch({ type: "deepLink", path: pathname });
    }
  }, [pathname, state.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const now = Date.now();
      if (nextState === "background" || nextState === "inactive") {
        dispatch({ type: "background", now });
      } else if (nextState === "active" && settings?.enabled) {
        dispatch({ type: "resume", now, timeoutMs: settings.backgroundTimeoutMs });
      }
    });
    return () => subscription.remove();
  }, [settings]);

  const unlock = useCallback(async () => {
    dispatch({ type: "requestUnlock" });
    setFailureReason(undefined);
    const result = await localAuthService.authenticate("unlock");
    if (result.status === "authenticated") {
      dispatch({ type: "authenticationSucceeded" });
    } else {
      setFailureReason(result.reason);
      dispatch({ type: "authenticationFailed", reason: result.reason });
    }
  }, [localAuthService]);

  const value = useMemo<AccessGateContextValue>(
    () => ({
      state,
      settings,
      refreshSettings,
      lock: () => dispatch({ type: "lock" })
    }),
    [refreshSettings, settings, state]
  );

  const blocked = state.status === "loading" || Boolean(settings?.enabled && state.status !== "unlocked");
  return (
    <AccessGateContext.Provider value={value}>
      <View
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        style={styles.root}
      >
        {children}
        {blocked ? (
          <AccessGateView
            authenticating={state.status === "authenticating"}
            failureReason={failureReason}
            loading={state.status === "loading"}
            onUnlock={() => void unlock()}
          />
        ) : null}
      </View>
    </AccessGateContext.Provider>
  );
}

export function useAccessGate(): AccessGateContextValue {
  const value = useContext(AccessGateContext);
  if (!value) throw new Error("useAccessGate must be used inside AccessGateProvider.");
  return value;
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  }
});
