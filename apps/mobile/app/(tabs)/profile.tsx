import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/auth-context";
import { mobileResendVerification } from "../../src/lib/auth-api";

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

  if (!user) return null;

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {!user.emailVerified && (
        <View style={styles.section}>
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
        </View>
      )}

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
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 24, gap: 28, paddingBottom: 48 },

  avatarSection: { alignItems: "center", gap: 10 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#2a2a2a" },
  avatarFallback: { justifyContent: "center", alignItems: "center", backgroundColor: "#6366f1" },
  initials: { fontSize: 32, fontWeight: "800", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", color: "#fff" },
  roleBadge: {
    backgroundColor: "#1e1e3f",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#6366f1",
  },
  roleText: { color: "#818cf8", fontSize: 12, fontWeight: "700" },

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
    backgroundColor: "#1f1729",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4c1d95",
    padding: 14,
    gap: 10,
  },
  verifyTitle: { color: "#ddd6fe", fontSize: 14, fontWeight: "700" },
  verifySubtitle: { color: "#c4b5fd", fontSize: 13, lineHeight: 20 },
  verifyBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 9,
    paddingVertical: 11,
    alignItems: "center",
  },
  verifyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  verifyNotice: { color: "#e9d5ff", fontSize: 12, lineHeight: 18 },

  logoutBtn: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ef4444",
  },
  pressed: { opacity: 0.7 },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },

  version: { textAlign: "center", color: "#444", fontSize: 12 },
});
