import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { relaySessionManager } from "@/lib/relay-session";

export default function RootLayout() {
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    let active = true;

    void relaySessionManager.restorePersistedSession().finally(() => {
      if (active) {
        setIsRestored(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!isRestored) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "bold" as const },
        contentStyle: { backgroundColor: "#111111" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
});
