import * as WebBrowser from "expo-web-browser";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { CART_MAX_QUANTITY_PER_TIER } from "@vybx/schemas";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../../src/lib/api";
import { useEvent } from "../../src/hooks/useEvents";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, isError } = useEvent(id ?? "");
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);

  const availableTypes = useMemo(
    () => event?.ticketTypes?.filter((t) => t.quantity - t.sold > 0) ?? [],
    [event?.ticketTypes],
  );

  const selectedTier = useMemo(
    () => availableTypes.find((tier) => tier.id === selectedTicketTypeId) ?? null,
    [availableTypes, selectedTicketTypeId],
  );
  const maxSelectableQuantity = useMemo(() => {
    if (!selectedTier) return 1;
    return Math.max(
      1,
      Math.min(CART_MAX_QUANTITY_PER_TIER, selectedTier.quantity - selectedTier.sold),
    );
  }, [selectedTier]);

  useEffect(() => {
    if (availableTypes.length === 0) {
      setSelectedTicketTypeId(null);
      return;
    }

    setSelectedTicketTypeId((current) => {
      if (current && availableTypes.some((tier) => tier.id === current)) {
        return current;
      }
      return availableTypes[0]!.id;
    });
  }, [availableTypes]);

  useEffect(() => {
    setQuantity((current) => {
      if (!selectedTier) return 1;
      return Math.max(1, Math.min(current, maxSelectableQuantity));
    });
  }, [selectedTier, maxSelectableQuantity]);

  async function handleCheckout() {
    if (!event || !selectedTier) return;
    try {
      const res = await api.post<{ checkoutUrl: string }>(
        "/payments/create-intent",
        { eventId: event.id, ticketTypeId: selectedTier.id, quantity },
      );
      if (res.checkoutUrl) {
        await WebBrowser.openBrowserAsync(res.checkoutUrl);
      }
    } catch {
      Alert.alert("Error", "No se pudo iniciar el pago. Inténtalo de nuevo.");
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isError || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudo cargar el evento.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: event.title }} />
      {/* Hero image */}
      {event.image ? (
        <Image
          source={{ uri: event.image }}
          style={styles.hero}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.heroPlaceholderText}>🎵</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          {event.isFeatured && (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>Destacado</Text>
            </View>
          )}
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.date}>{formatDate(event.date)}</Text>
          {event.location && (
            <Text style={styles.location}>📍 {event.location}</Text>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre el evento</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* Ticket types */}
        {event.ticketTypes && event.ticketTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entradas disponibles</Text>
            {event.ticketTypes.map((tier) => {
              const available = tier.quantity - tier.sold;
              const soldOut = available <= 0;
              const selected = selectedTier?.id === tier.id;
              return (
                <Pressable
                  key={tier.id}
                  style={[
                    styles.tierCard,
                    soldOut && styles.tierCardSoldOut,
                    selected && styles.tierCardSelected,
                  ]}
                  disabled={soldOut}
                  onPress={() => setSelectedTicketTypeId(tier.id)}
                >
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <Text style={styles.tierAvail}>
                      {soldOut ? "Agotado" : `${available} disponibles`}
                    </Text>
                  </View>
                  <Text style={styles.tierPrice}>
                    {tier.price === 0 ? "Gratis" : `$${tier.price.toFixed(2)}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {selectedTier && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cantidad</Text>
            <View style={styles.quantityCard}>
              <Pressable
                style={[
                  styles.quantityBtn,
                  quantity <= 1 && styles.quantityBtnDisabled,
                ]}
                onPress={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={quantity <= 1}
              >
                <Text style={styles.quantityBtnText}>−</Text>
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                style={[
                  styles.quantityBtn,
                  quantity >= maxSelectableQuantity && styles.quantityBtnDisabled,
                ]}
                onPress={() =>
                  setQuantity((current) =>
                    Math.min(maxSelectableQuantity, current + 1),
                  )
                }
                disabled={quantity >= maxSelectableQuantity}
              >
                <Text style={styles.quantityBtnText}>+</Text>
              </Pressable>
            </View>
            <Text style={styles.quantityHint}>
              Máximo {maxSelectableQuantity} por compra para este tipo.
            </Text>
            <Text style={styles.totalPrice}>
              Total:{" "}
              {selectedTier.price === 0
                ? "Gratis"
                : `$${(selectedTier.price * quantity).toFixed(2)}`}
            </Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          style={[
            styles.ctaBtn,
            !selectedTier && styles.ctaBtnDisabled,
          ]}
          disabled={!selectedTier}
          onPress={() => void handleCheckout()}
        >
          <Text style={styles.ctaText}>
            {!selectedTier ? "Agotado" : `Comprar ${quantity} × ${selectedTier.name}`}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { color: "#f87171", fontSize: 15, marginBottom: 12 },
  backLink: { color: "#6366f1", fontSize: 14, fontWeight: "600" },

  hero: { width: "100%", height: 260 },
  heroPlaceholder: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  heroPlaceholderText: { fontSize: 64 },

  body: { padding: 20, gap: 24 },

  header: { gap: 8 },
  featuredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#6366f1",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "800", color: "#fff", lineHeight: 32 },
  date: { fontSize: 14, color: "#6366f1", fontWeight: "600" },
  location: { fontSize: 14, color: "#aaa" },

  section: { gap: 12 },
  sectionTitle: {
    fontSize: 13,
    color: "#666",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: { fontSize: 15, color: "#ccc", lineHeight: 24 },

  tierCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  tierCardSoldOut: { opacity: 0.45 },
  tierCardSelected: {
    borderColor: "#6366f1",
    backgroundColor: "#1e1e3f",
  },
  tierInfo: { gap: 2 },
  tierName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  tierAvail: { fontSize: 12, color: "#888" },
  tierPrice: { fontSize: 16, fontWeight: "700", color: "#6366f1" },
  quantityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  quantityBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#2c2c2c",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnDisabled: {
    opacity: 0.45,
  },
  quantityBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 24 },
  quantityValue: { color: "#fff", fontSize: 20, fontWeight: "800", minWidth: 28, textAlign: "center" },
  quantityHint: { color: "#888", fontSize: 12 },
  totalPrice: { color: "#ddd", fontSize: 14, fontWeight: "600" },

  ctaBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaBtnDisabled: { backgroundColor: "#2a2a2a" },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
