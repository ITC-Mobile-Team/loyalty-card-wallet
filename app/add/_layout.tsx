import { Stack } from "expo-router";

import { colors } from "@/design/tokens";

export default function AddCardLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.surface.app },
        headerStyle: { backgroundColor: colors.surface.app },
        headerTintColor: colors.text.primary
      }}
    >
      <Stack.Screen name="scan" options={{ title: "Add Card" }} />
      <Stack.Screen name="manual" options={{ title: "Manual Entry" }} />
      <Stack.Screen name="catalog" options={{ title: "Choose Merchant" }} />
      <Stack.Screen name="photo" options={{ title: "Import Photo" }} />
    </Stack>
  );
}
