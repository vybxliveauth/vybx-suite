import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { colors } from "../../src/theme/tokens";
import { useAuth } from "../../src/context/auth-context";
import {
  consumePendingPkceVerifier,
  exchangeMobileAuthCode,
} from "../../src/lib/account-auth-session";

/**
 * Handles the deep-link callback from the browser auth session.
 *
 * On iOS, openAuthSessionAsync intercepts the redirect before the app
 * navigates here, so this screen rarely renders. On Android (Chrome Custom
 * Tabs), the deep link may open the app directly, landing on this screen
 * with the PKCE auth_code in the URL query params.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { completeBrowserAuth } = useAuth();
  const params = useLocalSearchParams<{
    auth_code?: string;
    status?: string;
    state?: string;
  }>();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    let isMounted = true;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    const extractCallbackParams = (rawUrl: string | null) => {
      if (!rawUrl) return null;
      try {
        const url = new URL(rawUrl);
        const fromSearch = new URLSearchParams(url.search);
        const fromHash = new URLSearchParams(
          url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
        );
        const authCode = fromSearch.get("auth_code") ?? fromHash.get("auth_code");
        const state = fromSearch.get("state") ?? fromHash.get("state");
        const statusFromUrl = fromSearch.get("status") ?? fromHash.get("status");
        if (statusFromUrl === "success") {
          return { authCode, state };
        }
      } catch {
        // ignore malformed deep links
      }
      return null;
    };

    void (async () => {
      const initialUrl = await Linking.getInitialURL();
      const parsed = extractCallbackParams(initialUrl);
      const fromParamsCode =
        params.status === "success" &&
        typeof params.auth_code === "string" &&
        params.auth_code.trim().length > 0 &&
        typeof params.state === "string" &&
        params.state.trim().length > 0
          ? {
              authCode: params.auth_code,
              state: params.state,
            }
          : null;

      const resolvedCode =
        fromParamsCode ??
        (parsed?.authCode && parsed?.state
          ? { authCode: parsed.authCode, state: parsed.state }
          : null);

      if (resolvedCode) {
        const verifier = consumePendingPkceVerifier(resolvedCode.state);
        if (!verifier) {
          router.replace("/(auth)/login");
          return;
        }
        const exchanged = await exchangeMobileAuthCode({
          authCode: resolvedCode.authCode,
          state: resolvedCode.state,
          codeVerifier: verifier,
        });
        if (!exchanged) {
          router.replace("/(auth)/login");
          return;
        }
        void completeBrowserAuth({
          accessToken: exchanged.accessToken,
          refreshToken: exchanged.refreshToken,
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

      // No auth_code in URL — openAuthSessionAsync already handled the deep link
      // on iOS, or the user arrived here without a valid callback.
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
