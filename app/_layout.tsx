import { DarkTheme, Stack, ThemeProvider, useRootNavigationState, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/core/di/AppProviders";
import { StartupSplashProvider, useStartupSplash } from "@/core/startup/StartupSplash";
import { colors } from "@/design/tokens";
import { AccessGateProvider } from "@/core/security/AccessGate";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

export default function RootLayout() {
  return (
    <StartupSplashProvider>
      <AppProviders>
        <AccessGateProvider>
          <ThemeProvider value={appNavigationTheme}>
            <StatusBar style="light" />
            <StartupSplashRouteFallback />
            <Stack
              initialRouteName="(tabs)"
              screenOptions={{
                contentStyle: { backgroundColor: colors.surface.app },
                headerBackButtonDisplayMode: "minimal",
                headerShadowVisible: false,
                headerStyle: { backgroundColor: colors.surface.app },
                headerTintColor: colors.text.primary
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="add" options={{ headerShown: false, presentation: "modal" }} />
              <Stack.Screen name="card/[id]/index" options={{ animation: "simple_push", title: "Card" }} />
              <Stack.Screen name="card/[id]/edit" options={{ presentation: "modal", title: "Edit Card" }} />
              <Stack.Screen
                name="card/[id]/scan-mode"
                options={{ headerShown: false, presentation: "fullScreenModal" }}
              />
              <Stack.Screen name="store/[id]" options={{ animation: "simple_push", title: "Store" }} />
              <Stack.Screen name="share/card" options={{ presentation: "modal", title: "Shared Card" }} />
            </Stack>
          </ThemeProvider>
        </AccessGateProvider>
      </AppProviders>
    </StartupSplashProvider>
  );
}

function StartupSplashRouteFallback() {
  const navigationState = useRootNavigationState();
  const routeSegments: readonly string[] = useSegments();
  const { markReady } = useStartupSplash();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    const [rootSegment, leafSegment] = routeSegments;
    const isIndexRoute = routeSegments.length === 0;
    const isInitialCardsRoute = rootSegment === "(tabs)" && (leafSegment === undefined || leafSegment === "cards");

    if (!isIndexRoute && !isInitialCardsRoute) {
      markReady();
    }
  }, [markReady, navigationState?.key, routeSegments]);

  return null;
}

const appNavigationTheme: typeof DarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.surface.app,
    border: colors.border.separator,
    card: colors.surface.app,
    notification: colors.action.danger,
    primary: colors.action.focus,
    text: colors.text.primary
  }
};
