import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import type { PublicEvent } from "../hooks/useEvents";
import { useAppTheme } from "../context/theme-context";
import { radius, type AppColors, type ThemeVariant } from "../theme/tokens";

type NearbyCarouselProps = {
  events: PublicEvent[];
  city: string | null;
  isLocating: boolean;
  onRequestLocation: () => void;
  onPressEvent: (eventId: string) => void;
};

function formatDate(dateInput: string) {
  const date = new Date(dateInput);
  return date.toLocaleDateString("es-DO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function NearbyCarousel({
  events,
  city,
  isLocating,
  onRequestLocation,
  onPressEvent,
}: NearbyCarouselProps) {
  const { width } = useWindowDimensions();
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, resolvedTheme), [colors, resolvedTheme]);
  const cardWidth = Math.max(width - 52, 280);

  if (!city) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyHeader}>
          <Ionicons name="location-outline" size={18} color={colors.brand} />
          <Text style={styles.emptyTitle}>Cerca de ti</Text>
        </View>
        <Text style={styles.emptySubtitle}>
          Activa ubicación para mostrar eventos realmente cercanos a ti.
        </Text>
        <Pressable style={styles.enableBtn} onPress={onRequestLocation}>
          <Text style={styles.enableBtnText}>
            {isLocating ? "Detectando ubicación..." : "Usar mi ubicación"}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!events.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyHeader}>
          <Ionicons name="location-outline" size={18} color={colors.brand} />
          <Text style={styles.emptyTitle}>Cerca de ti · {city}</Text>
        </View>
        <Text style={styles.emptySubtitle}>
          Aún no vemos eventos para esa zona. Prueba con otro filtro o explora recomendados.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>Cerca de ti</Text>
        <Text style={styles.city}>{city}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 10}
        disableIntervalMomentum
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { width: cardWidth }]}
            onPress={() => onPressEvent(item.id)}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} contentFit="cover" style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.placeholderIcon}>📍</Text>
              </View>
            )}
            <View style={styles.overlay} />
            <View style={styles.cardContent}>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.location} numberOfLines={1}>
                {item.location || city}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

function createStyles(colors: AppColors, resolvedTheme: ThemeVariant) {
  return StyleSheet.create({
    wrapper: {
      gap: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    city: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    listContent: {
      gap: 10,
      paddingRight: 6,
    },
    card: {
      height: 170,
      borderRadius: radius.lg,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    image: {
      ...StyleSheet.absoluteFillObject,
    },
    imagePlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.surfaceStrong,
    },
    placeholderIcon: { fontSize: 36 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        resolvedTheme === "dark" ? "rgba(2,8,23,0.4)" : "rgba(15,23,42,0.22)",
    },
    cardContent: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      gap: 4,
    },
    date: {
      color: colors.white,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    cardTitle: {
      color: colors.white,
      fontSize: 18,
      fontWeight: "800",
      lineHeight: 22,
    },
    location: {
      color: "rgba(248,250,252,0.9)",
      fontSize: 13,
      fontWeight: "600",
    },

    emptyState: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8,
    },
    emptyHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: "700",
    },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 20,
    },
    enableBtn: {
      alignSelf: "flex-start",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.brand,
    },
    enableBtnText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
