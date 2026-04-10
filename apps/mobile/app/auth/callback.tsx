import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { colors } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/auth-context";

/**
 * Handles the deep-link callback from the browser auth session.
 *
 * On iOS, openAuthSessionAsync intercepts the redirect before the app
 * navigates here, so this screen rarely renders. On Android (Chrome Custom
 * Tabs), the deep link may open the app directly, landing on this screen
 * with the tokens in the URL query params.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { completeBrowserAuth } = useAuth();
  const params = useLocalSearchParams<{
    access_token?: string;
    refresh_token?: string;
    status?: string;
  }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let isMounted = true;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const extractTokensFromUrl = (rawUrl: string | null) => {
      if (!rawUrl) return null;
      try {
        const url = new URL(rawUrl);
        const fromSearch = new URLSearchParams(url.search);
        const fromHash = new URLSearchParams(
          url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
        );
        const accessToken = fromSearch.get("access_token") ?? fromHash.get("access_token");
        const refreshToken =
          fromSearch.get("refresh_token") ?? fromHash.get("refresh_token");
        const statusFromUrl = fromSearch.get("status") ?? fromHash.get("status");
        if (statusFromUrl === "success" && accessToken && refreshToken) {
          return { accessToken, refreshToken };
        }
      } catch {
        // ignore malformed deep links
      }
      return null;
    };

    const fromParams =
      params.status === "success" &&
      typeof params.access_token === "string" &&
      typeof params.refresh_token === "string"
        ? {
            accessToken: params.access_token,
            refreshToken: params.refresh_token,
          }
        : null;

    void (async () => {
      const initialUrl = await Linking.getInitialURL();
      const resolved = fromParams ?? extractTokensFromUrl(initialUrl);

      if (resolved) {
        void completeBrowserAuth({
          accessToken: resolved.accessToken,
          refreshToken: resolved.refreshToken,
        })
          .then(() => {
            if (!isMounted) return;
            router.replace("/(tabs)/profile");
          })
          .catch(() => {
            if (!isMounted) return;
            router.replace("/(auth)/login");
          });
        return;
      }

      // No tokens in URL — openAuthSessionAsync already handled them on iOS,
      // or the user arrived here without a valid callback. Navigate to profile
      // if already authenticated, otherwise to login.
      fallbackTimeout = setTimeout(() => {
        if (!isMounted) return;
        router.replace("/(tabs)/profile");
      }, 300);
    })();

    return () => {
      isMounted = false;
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.text}>Completando inicio de sesión...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 12,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
