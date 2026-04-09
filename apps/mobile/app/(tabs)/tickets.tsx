import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMyTickets, type MyTicket } from "../../src/hooks/useMyTickets";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TicketCard({ ticket }: { ticket: MyTicket }) {
  const event = ticket.ticketType.event;
  const isUsed = ticket.isUsed;

  return (
    <View style={[styles.card, isUsed && styles.cardUsed]}>
      {event.image && (
        <Image
          source={{ uri: event.image }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={[styles.badge, isUsed ? styles.badgeUsed : styles.badgeActive]}>
            <Text style={styles.badgeText}>{isUsed ? "Usado" : "Válido"}</Text>
          </View>
        </View>

        <Text style={styles.ticketType}>{ticket.ticketType.name}</Text>
        <Text style={styles.date}>{formatDate(event.date)}</Text>
        {event.location && (
          <Text style={styles.location} numberOfLines={1}>
            📍 {event.location}
          </Text>
        )}

        {!isUsed && ticket.qrCode && (
          <View style={styles.qrSection}>
            <Text style={styles.qrLabel}>Código QR</Text>
            <Text style={styles.qrCode} numberOfLines={1}>
              {ticket.qrCode}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useMyTickets();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No se pudieron cargar tus tickets.</Text>
        <Text style={styles.retryText} onPress={() => void refetch()}>
          Reintentar
        </Text>
      </View>
    );
  }

  const tickets = data?.data ?? [];

  return (
    <FlatList
      data={tickets}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <TicketCard ticket={item} />}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          tintColor="#6366f1"
        />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎟️</Text>
          <Text style={styles.emptyTitle}>Sin tickets aún</Text>
          <Text style={styles.emptySubtitle}>
            Tus entradas compradas aparecerán aquí.
          </Text>
        </View>
      }
      style={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  list: { padding: 16, paddingBottom: 32 },
  separator: { height: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { color: "#f87171", fontSize: 15, textAlign: "center", marginBottom: 12 },
  retryText: { color: "#6366f1", fontSize: 14, fontWeight: "600" },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptySubtitle: { color: "#666", fontSize: 14, textAlign: "center" },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardUsed: { opacity: 0.55 },
  eventImage: { width: "100%", height: 120 },
  cardBody: { padding: 14, gap: 6 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  eventTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: "#fff", lineHeight: 22 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeActive: { backgroundColor: "#16a34a" },
  badgeUsed: { backgroundColor: "#374151" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  ticketType: { fontSize: 13, color: "#6366f1", fontWeight: "600" },
  date: { fontSize: 13, color: "#aaa" },
  location: { fontSize: 13, color: "#888" },
  qrSection: {
    marginTop: 8,
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "#333",
  },
  qrLabel: { fontSize: 11, color: "#888", fontWeight: "600", textTransform: "uppercase" },
  qrCode: { fontSize: 12, color: "#6366f1", fontFamily: "monospace" },
});
