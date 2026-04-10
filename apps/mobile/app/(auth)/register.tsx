import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form) {
    return (value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  }

  function passwordError(password: string): string | null {
    if (password.length < 12) return "Minimo 12 caracteres.";
    if (!/[A-Z]/.test(password))
      return "Debe incluir al menos una letra mayuscula.";
    if (!/[0-9]/.test(password)) return "Debe incluir al menos un numero.";
    if (!/[!@#$%^&*(),.?\":{}|<>_\-+=/\\[\];'`~]/.test(password)) {
      return "Debe incluir al menos un caracter especial.";
    }
    return null;
  }

  async function handleRegister() {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      Alert.alert("Campos requeridos", "Completa todos los campos.");
      return;
    }
    const passError = passwordError(form.password);
    if (passError) {
      Alert.alert("Contrasena invalida", passError);
      return;
    }
    setLoading(true);
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
      Alert.alert(
        "¡Cuenta creada!",
        "Revisa tu email para verificar tu cuenta y luego inicia sesión.",
        [{ text: "Ir al login", onPress: () => router.replace("/(auth)/login") }],
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al registrarse";
      const normalized = message
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const requiresWebSignup =
        normalized.includes("turnstile") ||
        normalized.includes("verificacion de seguridad") ||
        normalized.includes("trafico sospechoso");
      if (requiresWebSignup) {
        Alert.alert(
          "Registro en web requerido",
          "Por seguridad, el registro se completa en la web. Luego puedes iniciar sesion aqui.",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Abrir vybxlive.com",
              onPress: () => {
                void Linking.openURL("https://vybxlive.com");
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.tagline}>Crea tu cuenta gratis</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear cuenta</Text>

          <View style={styles.row}>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={form.firstName}
                onChangeText={set("firstName")}
                placeholder="Ana"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.field, styles.flex]}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={styles.input}
                value={form.lastName}
                onChangeText={set("lastName")}
                placeholder="García"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={set("email")}
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
              value={form.password}
              onChangeText={set("password")}
              placeholder="Min. 12, 1 mayuscula, 1 numero, 1 simbolo"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
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
    gap: 32,
  },
  header: { alignItems: "center", gap: 8 },
  logo: { fontSize: 32, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 },
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
  row: { flexDirection: "row", gap: 12 },
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
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.brand, fontSize: 14, fontWeight: "600" },
});
