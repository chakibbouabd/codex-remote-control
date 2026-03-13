import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "bold" as const },
        tabBarStyle: { backgroundColor: "#0a0a0a", borderTopColor: "#333333" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#666666",
        contentStyle: { backgroundColor: "#111111" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Threads", tabBarLabel: "Chats" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarLabel: "Settings" }}
      />
    </Tabs>
  );
}
