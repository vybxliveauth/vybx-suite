import { useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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

    const { access_token, refresh_token, status } = params;

    if (status === "success" && access_token && refresh_token) {
      completeBrowserAuth({ accessToken: access_token, refreshToken: refresh_token })
        .then(() => {
          router.replace("/(tabs)/profile");
        })
        .catch(() => {
          router.replace("/(auth)/login");
        });
      return;
    }

    // No tokens in URL — openAuthSessionAsync already handled them on iOS,
    // or the user arrived here without a valid callback. Navigate to profile
    // if already authenticated, otherwise to login.
    const fallback = setTimeout(() => {
      router.replace("/(tabs)/profile");
    }, 300);
    return () => clearTimeout(fallback);
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
