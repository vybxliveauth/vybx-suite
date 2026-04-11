import { useMemo, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { ConversionBanner } from "../../src/components/ConversionBanner";
import { PersonalizationSheet } from "../../src/components/PersonalizationSheet";
import { useAudiencePreferences } from "../../src/context/audience-preferences-context";
import { useAuth } from "../../src/context/auth-context";
import { mobileResendVerification } from "../../src/lib/auth-api";
import { startAccountAuthSession } from "../../src/lib/account-auth-session";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { useCategories } from "../../src/hooks/useCategories";
import {
  useAppTheme,
  type ThemeMode,
} from "../../src/context/theme-context";
import { type AppColors } from "../../src/theme/tokens";

const ROLE_LABEL: Record<string, string> = {
  USER: "Usuario",
  PROMOTER: "Promotor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, completeBrowserAuth } = useAuth();
  const { data: categories } = useCategories();
  const { preferences, completeOnboarding, resetPreferences } = useAudiencePreferences();
  const { colors, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState(false);
  const [showPreferencesSheet, setShowPreferencesSheet] = useState(false);

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

  async function handleGuestLogin() {
    setStartingSession(true);
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
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "No se pudo iniciar sesión.",
      );
    } finally {
      setStartingSession(false);
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
              inicia sesión en la web.
            </Text>
            <Pressable
              style={[styles.primaryButton, startingSession && styles.buttonDisabled]}
              onPress={() => void handleGuestLogin()}
              disabled={startingSession}
            >
              <Text style={styles.primaryButtonText}>
                {startingSession ? "Abriendo navegador..." : "Iniciar sesión"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.ghostButton}
              onPress={() => setShowPreferencesSheet(true)}
            >
              <Text style={styles.ghostButtonText}>Personalizar inicio</Text>
            </Pressable>
          </View>
        </ScrollView>
        <PersonalizationSheet
          visible={showPreferencesSheet}
          categories={categories ?? []}
          initialCity={preferences.city}
          initialVibeCategoryIds={preferences.vibeCategoryIds}
          onClose={() => setShowPreferencesSheet(false)}
          onSave={async ({ city, vibeCategoryIds }) => {
            await completeOnboarding({ city, vibeCategoryIds });
          }}
        />
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

          <InfoRow label="Email" value={user.email} styles={styles} />
          {user.city && <InfoRow label="Ciudad" value={user.city} styles={styles} />}
          {user.country && <InfoRow label="País" value={user.country} styles={styles} />}
          <InfoRow
            label="Email verificado"
            value={user.emailVerified ? "Sí" : "Pendiente"}
            styles={styles}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apariencia</Text>
          <ThemeModeSelector mode={mode} onChange={setMode} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendaciones</Text>
          <View style={styles.prefCard}>
            <Text style={styles.prefTitle}>
              Ciudad: {preferences.city || "Sin definir"}
            </Text>
            <Text style={styles.prefSubtitle}>
              Vibes:{" "}
              {preferences.vibeCategoryIds.length > 0
                ? preferences.vibeCategoryIds
                    .map((id) => categories?.find((category) => category.id === id)?.name || id)
                    .join(", ")
                : "sin preferencias todavía"}
            </Text>
            <View style={styles.prefActions}>
              <Pressable
                style={styles.prefButtonPrimary}
                onPress={() => setShowPreferencesSheet(true)}
              >
                <Text style={styles.prefButtonPrimaryText}>Editar gustos</Text>
              </Pressable>
              <Pressable
                style={styles.prefButtonGhost}
                onPress={() => {
                  void resetPreferences();
                }}
              >
                <Text style={styles.prefButtonGhostText}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <ConversionBanner
            isLoggedIn
            onPrimaryPress={() =>
              Alert.alert(
                "Alertas inteligentes",
                "Próximamente podrás activar alertas por artista, ciudad y categoría.",
              )
            }
            onSecondaryPress={() => setShowPreferencesSheet(true)}
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
          <Pressable
            style={({ pressed }) => [styles.labBtn, pressed && styles.pressed]}
            onPress={() => router.push("/storybook" as Href)}
            accessibilityRole="button"
            accessibilityLabel="Abrir Storybook"
          >
            <Text style={styles.labText}>Abrir UI Lab (Storybook)</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>VybeTickets Mobile • v1.0.0</Text>
      </ScrollView>
      <PersonalizationSheet
        visible={showPreferencesSheet}
        categories={categories ?? []}
        initialCity={preferences.city}
        initialVibeCategoryIds={preferences.vibeCategoryIds}
        onClose={() => setShowPreferencesSheet(false)}
        onSave={async ({ city, vibeCategoryIds }) => {
          await completeOnboarding({ city, vibeCategoryIds });
        }}
      />
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ThemeModeSelector({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (nextMode: ThemeMode) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const options: Array<{ mode: ThemeMode; label: string }> = [
    { mode: "light", label: "Claro" },
    { mode: "dark", label: "Oscuro" },
    { mode: "system", label: "Sistema" },
  ];

  return (
    <View style={styles.themeSwitchRow}>
      {options.map((option) => {
        const active = option.mode === mode;
        return (
          <Pressable
            key={option.mode}
            style={({ pressed }) => [
              styles.themeChip,
              active && styles.themeChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              void onChange(option.mode);
            }}
          >
            <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { padding: 24, gap: 28, paddingBottom: 48 },
    guestContent: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 18 },
    header: {},
    guestCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 22,
      gap: 14,
      alignItems: "center",
    },
    guestEmoji: { fontSize: 36 },
    guestTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    guestSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
    },
    primaryButton: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingVertical: 12,
      width: "100%",
      alignItems: "center",
    },
    primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
    ghostButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingVertical: 11,
      width: "100%",
      alignItems: "center",
    },
    ghostButtonText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 14,
    },

    avatarSection: { alignItems: "center", gap: 10 },
    avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surfaceStrong },
    avatarFallback: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.brand,
    },
    initials: { fontSize: 32, fontWeight: "800", color: colors.white },
    name: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
    roleBadge: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.brand,
    },
    roleText: { color: colors.brand, fontSize: 12, fontWeight: "700" },

    section: { gap: 12 },
    sectionTitle: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    buttonDisabled: { opacity: 0.65 },

    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowLabel: { fontSize: 14, color: colors.textSecondary },
    rowValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "500",
      maxWidth: "60%",
      textAlign: "right",
    },

    themeSwitchRow: {
      flexDirection: "row",
      gap: 8,
    },
    themeChip: {
      flex: 1,
      alignItems: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    themeChipActive: {
      borderColor: colors.brand,
      backgroundColor: colors.surfaceMuted,
    },
    themeChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },
    themeChipTextActive: {
      color: colors.brand,
    },

    prefCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    prefTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "700",
    },
    prefSubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    prefActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    prefButtonPrimary: {
      flex: 1,
      backgroundColor: colors.brand,
      borderRadius: 9,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    prefButtonPrimaryText: {
      color: colors.white,
      fontWeight: "700",
      fontSize: 13,
    },
    prefButtonGhost: {
      width: 72,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    prefButtonGhostText: {
      color: colors.textPrimary,
      fontWeight: "700",
      fontSize: 13,
    },

    verifyCard: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    verifyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    verifySubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    verifyBtn: {
      backgroundColor: colors.brand,
      borderRadius: 9,
      paddingVertical: 11,
      alignItems: "center",
    },
    verifyBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
    verifyNotice: { color: colors.textSecondary, fontSize: 12, lineHeight: 18 },

    logoutBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.danger,
    },
    labBtn: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.7 },
    logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
    labText: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },

    version: { textAlign: "center", color: colors.textMuted, fontSize: 12 },
  });
}
