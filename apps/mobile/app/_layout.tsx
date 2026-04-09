/**
 * Root layout — wraps the entire app with QueryClient and Auth providers.
 * Handles the idle→loading→authenticated/unauthenticated boot sequence.
 *
 * Navigation:
 *   Authenticated   →  (tabs)  (home, my tickets, profile)
 *   Unauthenticated →  (auth)  (login, register)
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "../src/context/auth-context";
import { queryClient } from "../src/lib/query-client";

function AuthGate() {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === "idle" || status === "loading") return;

    const inAuthGroup = segments[0] === "(auth)";

    if (status === "authenticated" && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [status, segments, router]);

  if (status === "idle" || status === "loading") {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f0f0f" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0f0f0f" },
      }}
    >
      {/* Auth group — no header (handled by auth layout) */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Tabs — header controlled per-tab */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Event detail — back arrow + event title */}
      <Stack.Screen
        name="event/[id]"
        options={{ title: "Evento", headerBackTitle: "Atrás" }}
      />

      {/* 404 */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
