/**
 * Root layout — wraps the app with QueryClient and Auth providers.
 *
 * Navigation starts in tabs for everyone; auth is accessed from "Mi cuenta".
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/auth-context";
import { FavoritesProvider } from "../src/context/favorites-context";
import { queryClient } from "../src/lib/query-client";
import { colors } from "../src/theme/tokens";

function RootNavigator() {
  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Auth group — no header (handled by auth layout) */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Tabs — header controlled per-tab */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Event detail — back arrow + event title */}
      <Stack.Screen
        name="event/[id]"
        options={{
          title: "Evento",
          headerBackTitle: "Atrás",
          animation: "slide_from_right",
        }}
      />

      {/* 404 */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <RootNavigator />
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
