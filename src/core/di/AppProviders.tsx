import { useMemo, type PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DependencyContext } from "./DependencyContext";
import { createAppDependencies } from "./createAppDependencies";
import type { AppDependencyOverrides } from "./dependencies";

type AppProvidersProps = PropsWithChildren<{
  dependencies?: AppDependencyOverrides;
}>;

export function AppProviders({ children, dependencies }: AppProvidersProps) {
  const appDependencies = useMemo(() => createAppDependencies(dependencies), [dependencies]);

  return (
    <DependencyContext.Provider value={appDependencies}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </DependencyContext.Provider>
  );
}
