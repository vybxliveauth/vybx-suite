import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EventCard } from "../../src/components/EventCard";
import { useEvents } from "../../src/hooks/useEvents";

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isFetching } = useEvents();

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
        <Text style={styles.errorText}>No se pudieron cargar los eventos.</Text>
        <Text style={styles.retryText} onPress={() => void refetch()}>
          Reintentar
        </Text>
      </View>
    );
  }

  const events = data?.data ?? [];

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} />}
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
          <Text style={styles.emptyText}>No hay eventos disponibles.</Text>
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
  emptyText: { color: "#666", fontSize: 15, textAlign: "center" },
});
