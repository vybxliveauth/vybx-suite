import { Link, useRouter } from "expo-router";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { completeBrowserAuth } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleWebRegister() {
    setLoading(true);
    try {
      const result = await startAccountAuthSession("register");
      if (result.type === "cancel") return;
      if (result.type === "error") {
        Alert.alert("No se pudo crear la cuenta", result.message);
        return;
      }

      await completeBrowserAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      router.replace("/(tabs)/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo completar el registro.";
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
          <Text style={styles.tagline}>Registro seguro en navegador</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>
            Abriremos `account.vybxlive.com` para completar registro y
            verificaciones de seguridad. Después volverás a la app.
          </Text>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => void handleWebRegister()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Abriendo navegador..." : "Continuar"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.link}>Inicia sesión</Text>
            </Pressable>
          </Link>
        </View>
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
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});

