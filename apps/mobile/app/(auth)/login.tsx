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
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../../src/context/auth-context";
import { colors } from "../../src/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { login, verifyTwoFactor } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFactorChallengeId, setTwoFactorChallengeId] = useState<
    string | null
  >(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Campos requeridos", "Ingresa tu email y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (result.requiresTwoFactor) {
        setTwoFactorChallengeId(result.challengeId);
        setTwoFactorCode("");
        setTwoFactorNotice(
          result.message ||
            `Codigo 2FA enviado. Expira en ${Math.max(
              1,
              Math.ceil(result.expiresInSeconds / 60),
            )} min.`,
        );
        return;
      }
      router.replace("/(tabs)/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyTwoFactor() {
    if (!twoFactorChallengeId) return;
    if (twoFactorCode.trim().length < 4) {
      Alert.alert("Codigo requerido", "Ingresa el codigo 2FA.");
      return;
    }
    setLoading(true);
    try {
      await verifyTwoFactor(twoFactorChallengeId, twoFactorCode.trim());
      router.replace("/(tabs)/profile");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Codigo 2FA invalido";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }

  function resetTwoFactorFlow() {
    setTwoFactorChallengeId(null);
    setTwoFactorCode("");
    setTwoFactorNotice(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>VybeTickets</Text>
          <Text style={styles.tagline}>Tu puerta a los mejores eventos</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Inicia sesión</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={
                twoFactorChallengeId ? handleVerifyTwoFactor : handleLogin
              }
            />
          </View>

          {twoFactorChallengeId && (
            <View style={styles.twoFactorBox}>
              <Text style={styles.twoFactorTitle}>Verificacion en dos pasos</Text>
              <Text style={styles.twoFactorText}>
                {twoFactorNotice || "Ingresa el codigo enviado a tu email."}
              </Text>
              <TextInput
                style={styles.input}
                value={twoFactorCode}
                onChangeText={(value) =>
                  setTwoFactorCode(value.replace(/\D/g, ""))
                }
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleVerifyTwoFactor}
                maxLength={8}
              />
              <Pressable
                style={styles.ghostButton}
                onPress={resetTwoFactorFlow}
                disabled={loading}
              >
                <Text style={styles.ghostButtonText}>Usar otra cuenta</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={twoFactorChallengeId ? handleVerifyTwoFactor : handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? twoFactorChallengeId
                  ? "Verificando..."
                  : "Entrando..."
                : twoFactorChallengeId
                  ? "Verificar codigo"
                  : "Entrar"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.link}>Regístrate</Text>
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
    gap: 32,
  },
  header: { alignItems: "center", gap: 8 },
  logo: { fontSize: 32, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  twoFactorBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  twoFactorTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
  twoFactorText: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  ghostButton: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});
