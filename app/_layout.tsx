import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/core/di/AppProviders";
import { colors } from "@/design/tokens";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
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
    </AppProviders>
  );
}
