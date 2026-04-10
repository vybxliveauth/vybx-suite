import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/auth-context";
import { mobileResendVerification } from "../../src/lib/auth-api";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { colors } from "../../src/theme/tokens";

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuario",
  PROMOTER: "Promotor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);

  async function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  }

  async function handleResendVerification() {
    if (!user) return;
    setResendingVerification(true);
    setVerificationNotice(null);
    try {
      const response = await mobileResendVerification(user.email);
      setVerificationNotice(
        response?.message || "Te enviamos un nuevo correo de verificación.",
      );
    } catch (err) {
      setVerificationNotice(
        err instanceof Error
          ? err.message
          : "No se pudo reenviar el correo de verificación.",
      );
    } finally {
      setResendingVerification(false);
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.container} contentContainerStyle={styles.guestContent}>
          <View style={styles.header}>
            <AppScreenHeader
              title="Mi Cuenta"
              subtitle="Accede para gestionar tu experiencia"
            />
          </View>
          <View style={styles.guestCard}>
            <Text style={styles.guestEmoji}>👋</Text>
            <Text style={styles.guestTitle}>Bienvenido a VybeTickets</Text>
            <Text style={styles.guestSubtitle}>
              Explora eventos libremente. Para ver tus boletos y gestionar tu cuenta,
              inicia sesión aquí.
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Iniciar sesión</Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Crear cuenta</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppScreenHeader
            title="Mi Cuenta"
            subtitle="Tu información y ajustes"
          />
        </View>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          {user.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.initials}>{initials || "?"}</Text>
            </View>
          )}
          <Text style={styles.name}>{fullName || "Usuario"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABEL[user.role] ?? user.role}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de cuenta</Text>

          <InfoRow label="Email" value={user.email} />
          {user.city && <InfoRow label="Ciudad" value={user.city} />}
          {user.country && <InfoRow label="País" value={user.country} />}
          <InfoRow
            label="Email verificado"
            value={user.emailVerified ? "Sí" : "Pendiente"}
          />
        </View>

        <View style={styles.section}>
          {!user.emailVerified && (
            <View style={styles.verifyCard}>
              <Text style={styles.verifyTitle}>Correo pendiente de verificación</Text>
              <Text style={styles.verifySubtitle}>
                Verifica tu email para asegurar acceso completo a tu cuenta.
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.verifyBtn,
                  pressed && styles.pressed,
                  resendingVerification && styles.buttonDisabled,
                ]}
                onPress={() => void handleResendVerification()}
                disabled={resendingVerification}
              >
                <Text style={styles.verifyBtnText}>
                  {resendingVerification
                    ? "Enviando..."
                    : "Reenviar correo de verificación"}
                </Text>
              </Pressable>
              {verificationNotice && (
                <Text style={styles.verifyNotice}>{verificationNotice}</Text>
              )}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>VybeTickets Mobile • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, gap: 28, paddingBottom: 48 },
  guestContent: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 18 },
  header: {},
  guestCard: {
    backgroundColor: "#11161d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 22,
    gap: 14,
    alignItems: "center",
  },
  guestEmoji: { fontSize: 36 },
  guestTitle: { color: "#fff", fontSize: 22, fontWeight: "700", textAlign: "center" },
  guestSubtitle: { color: "#aaa", fontSize: 14, lineHeight: 22, textAlign: "center" },
  primaryButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e3a8a",
    backgroundColor: "#101827",
  },
  secondaryButtonText: { color: "#93c5fd", fontWeight: "700", fontSize: 15 },

  avatarSection: { alignItems: "center", gap: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#2a2a2a" },
  avatarFallback: { justifyContent: "center", alignItems: "center", backgroundColor: colors.brand },
  initials: { fontSize: 32, fontWeight: "800", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: "#fff" },
  roleBadge: {
    backgroundColor: "#10233f",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  roleText: { color: "#93c5fd", fontSize: 12, fontWeight: "700" },

  section: { gap: 12 },
  sectionTitle: { fontSize: 13, color: "#666", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  buttonDisabled: { opacity: 0.65 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  rowLabel: { fontSize: 14, color: "#aaa" },
  rowValue: { fontSize: 14, color: "#fff", fontWeight: "500", maxWidth: "60%", textAlign: "right" },

  verifyCard: {
    backgroundColor: "#0f1a2b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e3a8a",
    padding: 14,
    gap: 10,
  },
  verifyTitle: { color: "#dbeafe", fontSize: 14, fontWeight: "700" },
  verifySubtitle: { color: "#bfdbfe", fontSize: 13, lineHeight: 20 },
  verifyBtn: {
    backgroundColor: colors.brand,
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
  },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  verifyNotice: { color: "#dbeafe", fontSize: 12, lineHeight: 18 },

  logoutBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  pressed: { opacity: 0.7 },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },

  version: { textAlign: "center", color: "#444", fontSize: 12 },
});
