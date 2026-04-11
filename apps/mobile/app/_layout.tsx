/**
 * Root layout — wraps the app with QueryClient and Auth providers.
 *
 * Navigation starts in tabs for everyone; auth is accessed from "Mi cuenta".
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { AppState } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { AuthProvider } from "../src/context/auth-context";
import { AudiencePreferencesProvider } from "../src/context/audience-preferences-context";
import { FavoritesProvider } from "../src/context/favorites-context";
import { ThemeProvider, useAppTheme } from "../src/context/theme-context";
import { tracker } from "../src/lib/analytics";
import { queryClient } from "../src/lib/query-client";

function RootNavigator() {
  const { colors } = useAppTheme();

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
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

      {/* OAuth-style callback from browser auth session */}
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />

      {/* Storybook / UI Lab */}
      <Stack.Screen
        name="storybook"
        options={{
          title: "UI Lab",
          headerBackTitle: "Atrás",
          animation: "slide_from_right",
        }}
      />

      {/* 404 */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function RootLayoutShell() {
  const { colors, resolvedTheme } = useAppTheme();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        void tracker.flush();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.bg);
  }, [colors.bg]);

  return (
    <>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AudiencePreferencesProvider>
            <FavoritesProvider>
              <RootNavigator />
            </FavoritesProvider>
          </AudiencePreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutShell />
    </ThemeProvider>
  );
}
