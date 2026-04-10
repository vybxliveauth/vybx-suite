import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { EventCard } from "../../src/components/EventCard";
import { EventCardSkeleton } from "../../src/components/EventCardSkeleton";
import { useEvents } from "../../src/hooks/useEvents";
import { useCategories } from "../../src/hooks/useCategories";
import { useFavorites } from "../../src/context/favorites-context";
import { colors } from "../../src/theme/tokens";

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useEvents();
  const { data: categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeFilter, setActiveFilter] = useState("all");

  const events = data?.data ?? [];
  const filters = useMemo(
    () => [
      { id: "all", label: "Para ti" },
      ...(categories ?? []).slice(0, 8).map((category) => ({
        id: category.id,
        label: category.name,
      })),
    ],
    [categories],
  );

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((event) => event.categoryId === activeFilter);
  }, [activeFilter, events]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          renderItem={() => <EventCardSkeleton />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.headerWrap}>
              <AppScreenHeader
                title="VybeTickets"
                subtitle="Descubre lo mejor cerca de ti"
                rightSlot={
                  <View style={styles.searchShortcut}>
                    <Ionicons name="search-outline" size={18} color="#cbd5e1" />
                  </View>
                }
              />
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loaderText}>Cargando eventos...</Text>
              </View>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudieron cargar los eventos.</Text>
          <Text style={styles.retryText} onPress={() => void refetch()}>
            Reintentar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <EventCard
            event={item}
            isFavorite={isFavorite(item.id)}
            onToggleFavorite={() => toggleFavorite(item.id)}
            animationDelay={index * 45}
          />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <AppScreenHeader
              title="VybeTickets"
              subtitle="Descubre lo mejor cerca de ti"
              rightSlot={
                <Pressable
                  style={({ pressed }) => [
                    styles.searchShortcut,
                    pressed && styles.searchShortcutPressed,
                  ]}
                  onPress={() => router.push("/(tabs)/search")}
                >
                  <Ionicons name="search-outline" size={18} color="#cbd5e1" />
                </Pressable>
              }
            />

            <FlatList
              data={filters}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersRow}
              renderItem={({ item }) => (
                <Pressable
                  android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: false }}
                  onPress={() => setActiveFilter(item.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    activeFilter === item.id && styles.filterChipActive,
                    pressed && styles.filterChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      activeFilter === item.id && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              No encontramos eventos para este filtro.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 36 },
  headerWrap: { paddingBottom: 14, gap: 14 },
  searchShortcut: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchShortcutPressed: { opacity: 0.85 },
  loaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  loaderText: { color: colors.textSecondary, fontSize: 13 },
  filtersRow: { paddingTop: 4, paddingBottom: 2, gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterChipPressed: { opacity: 0.84 },
  filterText: { color: colors.textSoft, fontSize: 13, fontWeight: "600" },
  filterTextActive: { color: colors.white },
  separator: { height: 14 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  errorText: { color: "#f87171", fontSize: 15, textAlign: "center", marginBottom: 12 },
  retryText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
});
