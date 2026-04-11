import { useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { PublicEvent } from "../hooks/useEvents";
import { useAppTheme } from "../context/theme-context";
import {
  radius,
  spacing,
  type AppColors,
  type ThemeVariant,
} from "../theme/tokens";

interface Props {
  event: PublicEvent;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  animationDelay?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function minPrice(event: PublicEvent): string {
  if (!event.ticketTypes?.length) return "Gratis";
  const prices = event.ticketTypes.map((t) => t.price).filter((p) => p >= 0);
  if (!prices.length) return "—";
  const min = Math.min(...prices);
  return min === 0 ? "Gratis" : `Desde $${min.toFixed(2)}`;
}

export function EventCard({
  event,
  isFavorite = false,
  onToggleFavorite,
  animationDelay = 0,
}: Props) {
  const router = useRouter();
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const scale = useSharedValue(1);
  const favoriteScale = useSharedValue(1);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const favoriteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  useEffect(() => {
    favoriteScale.value = withTiming(isFavorite ? 1.1 : 1, {
      duration: 170,
      easing: Easing.out(Easing.quad),
    });
  }, [isFavorite, favoriteScale]);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(300)}
      style={cardAnimatedStyle}
    >
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => router.push(`/event/${event.id}`)}
        onPressIn={() => {
          scale.value = withTiming(0.985, { duration: 120 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 160 });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Ver evento ${event.title}`}
      >
        {event.image ? (
          <Animated.Image
            source={{ uri: event.image }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>🎵</Text>
          </View>
        )}

        <View style={styles.overlay} />

        <Pressable
          style={styles.favoriteBtn}
          onPress={(eventPress) => {
            eventPress.stopPropagation();
            onToggleFavorite?.();
          }}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"
          }
        >
          <Animated.View style={favoriteAnimatedStyle}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? colors.heart : colors.white}
            />
          </Animated.View>
        </Pressable>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            {event.isFeatured && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredText}>TOP</Text>
              </View>
            )}
            <Text style={styles.date}>{formatDate(event.date)}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.location && (
            <Text style={styles.location} numberOfLines={1}>
              📍 {event.location}
            </Text>
          )}
          <Text style={styles.price}>{minPrice(event)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: AppColors, resolvedTheme: ThemeVariant) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: { opacity: 0.92 },
    image: { width: "100%", height: 220 },
    imagePlaceholder: {
      backgroundColor: colors.surfaceStrong,
      justifyContent: "center",
      alignItems: "center",
    },
    imagePlaceholderText: { fontSize: 48 },
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor:
        resolvedTheme === "dark" ? "rgba(0,0,0,0.18)" : "rgba(15,23,42,0.08)",
    },
    favoriteBtn: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        resolvedTheme === "dark" ? "rgba(14,18,23,0.72)" : "rgba(255,255,255,0.84)",
      borderWidth: 1,
      borderColor:
        resolvedTheme === "dark" ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)",
    },
    body: { padding: spacing.md + 2, gap: spacing.sm - 1 },
    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    featuredBadge: {
      backgroundColor: colors.brand,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    featuredText: { color: colors.white, fontSize: 11, fontWeight: "700" },
    date: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.2,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.textPrimary,
      lineHeight: 24,
    },
    location: { fontSize: 13, color: colors.textSoft },
    price: {
      fontSize: 14,
      color: resolvedTheme === "dark" ? "#e2e8f0" : "#0f172a",
      fontWeight: "700",
      marginTop: 2,
    },
  });
}
