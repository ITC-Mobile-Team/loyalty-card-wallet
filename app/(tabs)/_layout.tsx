import { Tabs } from "expo-router";
import { CreditCard, Store, UserCircle } from "lucide-react-native";

import { colors } from "@/design/tokens";

const iconSize = 22;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface.app },
        headerTintColor: colors.text.primary,
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.surface.raised,
          borderTopColor: colors.border.separator
        }
      }}
    >
      <Tabs.Screen
        name="cards"
        options={{
          title: "Cards",
          tabBarIcon: ({ color }) => <CreditCard color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: "Stores",
          tabBarIcon: ({ color }) => <Store color={color} size={iconSize} />
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <UserCircle color={color} size={iconSize} />
        }}
      />
    </Tabs>
  );
}
