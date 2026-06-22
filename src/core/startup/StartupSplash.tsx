import * as SplashScreen from "expo-splash-screen";
import { createContext, useCallback, useContext, useMemo, useRef, type PropsWithChildren } from "react";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

type StartupSplashContextValue = {
  markReady: () => void;
};

const StartupSplashContext = createContext<StartupSplashContextValue | null>(null);

export function StartupSplashProvider({ children }: PropsWithChildren) {
  const didHideSplash = useRef(false);

  const markReady = useCallback(() => {
    if (didHideSplash.current) {
      return;
    }

    didHideSplash.current = true;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ markReady }), [markReady]);

  return <StartupSplashContext.Provider value={value}>{children}</StartupSplashContext.Provider>;
}

export function useStartupSplash() {
  const value = useContext(StartupSplashContext);

  if (!value) {
    throw new Error("useStartupSplash must be used within StartupSplashProvider.");
  }

  return value;
}
