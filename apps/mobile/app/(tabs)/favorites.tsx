import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueries } from "@tanstack/react-query";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { EventCard } from "../../src/components/EventCard";
import { EventCardSkeleton } from "../../src/components/EventCardSkeleton";
import { useFavorites } from "../../src/context/favorites-context";
import { useAppTheme } from "../../src/context/theme-context";
import { api } from "../../src/lib/api";
import { normalizePublicEvent, type PublicEvent } from "../../src/hooks/useEvents";
import { type AppColors } from "../../src/theme/tokens";

export default function FavoritesScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { favoriteIds, hydrated, isFavorite, toggleFavorite } = useFavorites();

  const favoriteIdList = useMemo(() => Array.from(favoriteIds), [favoriteIds]);

  const favoriteEventQueries = useQueries({
    queries: favoriteIdList.map((eventId) => ({
      queryKey: ["event", eventId],
      queryFn: async () => {
        const response = await api.get<PublicEvent>(`/events/${eventId}`);
        return normalizePublicEvent(response);
      },
      enabled: hydrated,
      staleTime: 1000 * 60 * 2,
    })),
  });

  const favoriteEvents = useMemo(
    () =>
      favoriteEventQueries
        .map((query) => query.data)
        .filter((event): event is PublicEvent => Boolean(event)),
    [favoriteEventQueries],
  );

  const isLoadingFavorites =
    !hydrated ||
    (favoriteIdList.length > 0 &&
      favoriteEventQueries.some((query) => query.isLoading));

  const isRefreshing = favoriteEventQueries.some((query) => query.isFetching);

  const hasQueryError = favoriteEventQueries.some((query) => query.isError);

  async function handleRefresh() {
    if (favoriteEventQueries.length === 0) return;
    await Promise.all(favoriteEventQueries.map((query) => query.refetch()));
  }

  if (isLoadingFavorites) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `favorite-skeleton-${item}`}
          renderItem={() => <EventCardSkeleton />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View>
              <AppScreenHeader
                title="Favoritos"
                subtitle="Tus eventos guardados para decidir más tarde."
              />
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loaderText}>Sincronizando favoritos...</Text>
              </View>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={favoriteEvents}
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
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={
          <AppScreenHeader
            title="Favoritos"
            subtitle="Tus eventos guardados para decidir más tarde."
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💙</Text>
            <Text style={styles.emptyTitle}>Aún no tienes favoritos</Text>
            <Text style={styles.emptySubtitle}>
              Toca el corazón en Inicio o Buscar para guardar eventos.
            </Text>
            {hasQueryError ? (
              <Text style={styles.errorText}>
                Algunos eventos favoritos ya no están disponibles.
              </Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, paddingBottom: 36 },
    separator: { height: 14 },
    loaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
    },
    loaderText: { color: colors.textSecondary, fontSize: 13 },
    emptyState: {
      marginTop: 44,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 22,
      alignItems: "center",
      gap: 8,
    },
    emptyEmoji: { fontSize: 30 },
    emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "700" },
    emptySubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 22,
      textAlign: "center",
    },
    errorText: {
      marginTop: 6,
      color: colors.warning,
      fontSize: 12,
      textAlign: "center",
    },
  });
}
