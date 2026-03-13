import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#ffffff",
        contentStyle: { backgroundColor: "#111111" },
      }}
    >
      <Stack.Screen name="connect" options={{ title: "Connect to Bridge" }} />
      <Stack.Screen name="pair" options={{ title: "Scan QR Code" }} />
    </Stack>
  );
}
