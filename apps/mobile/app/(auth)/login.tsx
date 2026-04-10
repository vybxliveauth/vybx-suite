import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { startAccountAuthSession } from "../../src/lib/account-auth-session";
import { useAuth } from "../../src/context/auth-context";
import { colors } from "../../src/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { completeBrowserAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleWebLogin() {
    setLoading(true);
    try {
      const result = await startAccountAuthSession("login");
      if (result.type === "cancel") return;
      if (result.type === "error") {
        Alert.alert("No se pudo iniciar sesión", result.message);
        return;
      }

      await completeBrowserAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      router.replace("/(tabs)/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo iniciar sesión.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>VybeTickets</Text>
          <Text style={styles.tagline}>Inicio de sesión seguro en navegador</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Text style={styles.subtitle}>
            Te llevaremos a `account.vybxlive.com` dentro de una sesión segura del
            sistema. Al terminar volverás a la app automáticamente.
          </Text>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => void handleWebLogin()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Abriendo navegador..." : "Continuar"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          Si no tienes cuenta, puedes crearla en la web desde esa misma pantalla.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 28,
  },
  header: { alignItems: "center", gap: 8 },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  footerText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
});
