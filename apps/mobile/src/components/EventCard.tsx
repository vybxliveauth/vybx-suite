import { useRouter } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { PublicEvent } from "../hooks/useEvents";

interface Props {
  event: PublicEvent;
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

export function EventCard({ event }: Props) {
  const router = useRouter();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Ver evento ${event.title}`}
    >
      {event.image ? (
        <Image
          source={{ uri: event.image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.imagePlaceholderText}>🎵</Text>
        </View>
      )}

      {event.isFeatured && (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredText}>Destacado</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.date}>{formatDate(event.date)}</Text>
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
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  pressed: { opacity: 0.85 },
  image: { width: "100%", height: 180 },
  imagePlaceholder: {
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: { fontSize: 48 },
  featuredBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#6366f1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: 14, gap: 4 },
  date: { fontSize: 12, color: "#6366f1", fontWeight: "600", textTransform: "uppercase" },
  title: { fontSize: 16, fontWeight: "700", color: "#fff", lineHeight: 22 },
  location: { fontSize: 13, color: "#888" },
  price: { fontSize: 14, color: "#aaa", fontWeight: "600", marginTop: 4 },
});
