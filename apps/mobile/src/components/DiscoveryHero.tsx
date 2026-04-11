import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PublicEvent } from "../hooks/useEvents";
import { useAppTheme } from "../context/theme-context";
import { radius, type AppColors, type ThemeVariant } from "../theme/tokens";

type DiscoveryHeroProps = {
  event: PublicEvent | null;
  city?: string;
  onPressPrimary: () => void;
  onPressSecondary: () => void;
};

function formatDate(input: string) {
  const date = new Date(input);
  return date.toLocaleDateString("es-DO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function DiscoveryHero({
  event,
  city,
  onPressPrimary,
  onPressSecondary,
}: DiscoveryHeroProps) {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );

  if (!event) {
    return (
      <View style={styles.fallbackCard}>
        <Text style={styles.kicker}>VYBXTICKETS</Text>
        <Text style={styles.fallbackTitle}>Tu cartelera premium en RD</Text>
        <Text style={styles.fallbackSubtitle}>
          Activa tus preferencias para mostrarte conciertos, teatro y festivales que sí te interesan.
        </Text>
        <Pressable style={styles.primaryCta} onPress={onPressSecondary}>
          <Text style={styles.primaryCtaText}>Personalizar experiencia</Text>
        </Pressable>
      </View>
    );
  }

  const locationLabel = city
    ? `En ${city}`
    : event.location || "República Dominicana";

  return (
    <Pressable onPress={onPressPrimary} style={styles.wrapper}>
      <ImageBackground
        source={{ uri: event.image || undefined }}
        resizeMode="cover"
        style={styles.image}
        imageStyle={styles.imageBorder}
      >
        <View style={styles.overlay} />

        <View style={styles.headerRow}>
          <View style={styles.topBadge}>
            <Ionicons name="sparkles" size={12} color={colors.white} />
            <Text style={styles.topBadgeText}>SELECCIÓN DEL DÍA</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(event.date)}</Text>
        </View>

        <View style={styles.bottomContent}>
          <Text style={styles.locationText}>{locationLabel}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.ctaRow}>
            <Pressable style={styles.primaryCta} onPress={onPressPrimary}>
              <Text style={styles.primaryCtaText}>Ver evento</Text>
            </Pressable>
            <Pressable style={styles.ghostCta} onPress={onPressSecondary}>
              <Text style={styles.ghostCtaText}>Afinar gustos</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function createStyles(colors: AppColors, resolvedTheme: ThemeVariant) {
  return StyleSheet.create({
    wrapper: {
      borderRadius: radius.xxl,
      overflow: "hidden",
    },
    image: {
      minHeight: 230,
      justifyContent: "space-between",
      padding: 16,
    },
    imageBorder: {
      borderRadius: radius.xxl,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        resolvedTheme === "dark"
          ? "rgba(2,8,23,0.48)"
          : "rgba(15,23,42,0.34)",
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      zIndex: 2,
    },
    topBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(15,23,42,0.62)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    topBadgeText: {
      color: colors.white,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
    dateText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    bottomContent: {
      zIndex: 2,
      gap: 8,
    },
    locationText: {
      color: "rgba(241,245,249,0.92)",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    title: {
      color: colors.white,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    ctaRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    primaryCta: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryCtaText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },
    ghostCta: {
      backgroundColor: "rgba(15,23,42,0.56)",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      paddingHorizontal: 14,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    ghostCtaText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },

    fallbackCard: {
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 8,
      backgroundColor: colors.surface,
    },
    kicker: {
      color: colors.brand,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
    },
    fallbackTitle: {
      color: colors.textPrimary,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
    },
    fallbackSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 4,
    },
  });
}
