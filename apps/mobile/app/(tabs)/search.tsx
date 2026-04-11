import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { EventCard } from "../../src/components/EventCard";
import { EventCardSkeleton } from "../../src/components/EventCardSkeleton";
import { useCategories } from "../../src/hooks/useCategories";
import { useEvents } from "../../src/hooks/useEvents";
import { useAudiencePreferences } from "../../src/context/audience-preferences-context";
import { useFavorites } from "../../src/context/favorites-context";
import { useAppTheme } from "../../src/context/theme-context";
import { type AppColors } from "../../src/theme/tokens";

export default function SearchScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { preferences } = useAudiencePreferences();
  const { data, isLoading, isError, error, isFetching, refetch } = useEvents();
  const { data: categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const events = data?.data ?? [];
  const normalizedQuery = query.trim().toLowerCase();

  const quickTags = useMemo(
    () => (categories ?? []).slice(0, 8),
    [categories],
  );

  useEffect(() => {
    if (activeCategoryId) return;
    const firstPreferred = preferences.vibeCategoryIds[0];
    if (!firstPreferred) return;
    const existsInTags = quickTags.some((category) => category.id === firstPreferred);
    if (!existsInTags) return;
    setActiveCategoryId(firstPreferred);
  }, [activeCategoryId, preferences.vibeCategoryIds, quickTags]);

  const filtered = useMemo(() => {
    let result = events;
    if (activeCategoryId) {
      result = result.filter((event) => event.categoryId === activeCategoryId);
    }
    if (normalizedQuery) {
      result = result.filter((event) => {
        const source = `${event.title} ${event.location ?? ""} ${event.description ?? ""}`;
        return source.toLowerCase().includes(normalizedQuery);
      });
    }
    return result;
  }, [events, normalizedQuery, activeCategoryId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `search-skeleton-${item}`}
          renderItem={() => <EventCardSkeleton />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppScreenHeader
                title="Buscar"
                subtitle={
                  preferences.city
                    ? `Encuentra eventos por nombre o ciudad (base: ${preferences.city})`
                    : "Encuentra eventos por nombre o ciudad"
                }
              />
              <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.searchPlaceholder}>Buscar eventos...</Text>
              </View>
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loaderText}>Preparando catálogo...</Text>
              </View>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  if (isError) {
    const detail = error instanceof Error ? error.message : null;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No pudimos cargar eventos</Text>
          {detail ? <Text style={styles.emptySubtitle}>{detail}</Text> : null}
          <Pressable style={styles.retryButton} onPress={() => void refetch()}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
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
          <View style={styles.header}>
            <AppScreenHeader
              title="Buscar"
              subtitle={
                preferences.city
                  ? `Encuentra eventos por nombre o ciudad (base: ${preferences.city})`
                  : "Encuentra eventos por nombre o ciudad"
              }
            />

            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar eventos..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            <FlatList
              data={quickTags}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsRow}
              renderItem={({ item }) => {
                const isActive = activeCategoryId === item.id;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.tag,
                      isActive && styles.tagActive,
                      pressed && styles.tagPressed,
                    ]}
                    onPress={() =>
                      setActiveCategoryId((prev) =>
                        prev === item.id ? null : item.id,
                      )
                    }
                  >
                    <Text style={[styles.tagText, isActive && styles.tagTextActive]}>
                      {item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptySubtitle}>
              Prueba con otro término o revisa Favoritos.
            </Text>
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
    header: { paddingBottom: 14, gap: 10 },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
    searchPlaceholder: { flex: 1, color: colors.textMuted, fontSize: 15 },
    loaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    loaderText: { color: colors.textSecondary, fontSize: 13 },
    tagsRow: { gap: 8, paddingTop: 4 },
    tag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    tagActive: { backgroundColor: colors.brand, borderColor: colors.brand },
    tagPressed: { opacity: 0.82 },
    tagText: { color: colors.textSoft, fontSize: 13, fontWeight: "600" },
    tagTextActive: { color: colors.white },
    emptyState: {
      marginTop: 40,
      padding: 22,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      gap: 6,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700" },
    emptySubtitle: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
    retryButton: {
      marginTop: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    retryButtonText: {
      color: colors.brand,
      fontSize: 13,
      fontWeight: "700",
    },
  });
}
