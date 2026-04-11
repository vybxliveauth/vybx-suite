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
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { ConversionBanner } from "../../src/components/ConversionBanner";
import { DiscoveryHero } from "../../src/components/DiscoveryHero";
import { EventCard } from "../../src/components/EventCard";
import { EventCardSkeleton } from "../../src/components/EventCardSkeleton";
import { PersonalizationSheet } from "../../src/components/PersonalizationSheet";
import { useAudiencePreferences } from "../../src/context/audience-preferences-context";
import { useAuth } from "../../src/context/auth-context";
import { useFavorites } from "../../src/context/favorites-context";
import { useCategories } from "../../src/hooks/useCategories";
import { useEvents } from "../../src/hooks/useEvents";
import { useAppTheme } from "../../src/context/theme-context";
import { type AppColors } from "../../src/theme/tokens";

function locationMatchesCity(location: string | null, city: string) {
  if (!location || !city.trim()) return false;
  return location.toLowerCase().includes(city.trim().toLowerCase());
}

function popularityScore(event: { ticketTypes?: Array<{ sold: number }> }) {
  return (event.ticketTypes ?? []).reduce((acc, ticketType) => acc + ticketType.sold, 0);
}

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useEvents();
  const { data: categories } = useCategories();
  const { isFavorite, toggleFavorite } = useFavorites();
  const {
    preferences,
    isReady: preferencesReady,
    completeOnboarding,
  } = useAudiencePreferences();

  const [activeFilter, setActiveFilter] = useState("all");
  const [showPreferencesSheet, setShowPreferencesSheet] = useState(false);
  const [didAutoloadPreferences, setDidAutoloadPreferences] = useState(false);

  const events = data?.data ?? [];
  const categoryLabelById = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  useEffect(() => {
    if (didAutoloadPreferences) return;
    if (!preferencesReady || isLoading) return;
    if (!preferences.onboardingCompleted) {
      setShowPreferencesSheet(true);
    }
    setDidAutoloadPreferences(true);
  }, [didAutoloadPreferences, isLoading, preferences.onboardingCompleted, preferencesReady]);

  const filters = useMemo(
    () => [
      { id: "all", label: "Para ti" },
      ...(preferences.city
        ? [{ id: "city", label: `En ${preferences.city}` }]
        : []),
      ...(categories ?? []).slice(0, 8).map((category) => ({
        id: category.id,
        label: category.name,
      })),
    ],
    [categories, preferences.city],
  );

  const scoredEvents = useMemo(() => {
    const selectedIds = new Set(preferences.vibeCategoryIds);
    return [...events].sort((a, b) => {
      const scoreA =
        (a.isFeatured ? 3 : 0) +
        (selectedIds.has(a.categoryId ?? "") ? 2 : 0) +
        (locationMatchesCity(a.location, preferences.city) ? 2 : 0) +
        popularityScore(a) / 1000;

      const scoreB =
        (b.isFeatured ? 3 : 0) +
        (selectedIds.has(b.categoryId ?? "") ? 2 : 0) +
        (locationMatchesCity(b.location, preferences.city) ? 2 : 0) +
        popularityScore(b) / 1000;

      return scoreB - scoreA;
    });
  }, [events, preferences.city, preferences.vibeCategoryIds]);

  const heroEvent = scoredEvents[0] ?? null;

  const filteredEvents = useMemo(() => {
    let result = scoredEvents;

    if (activeFilter === "city") {
      result = result.filter((event) => locationMatchesCity(event.location, preferences.city));
    } else if (activeFilter !== "all") {
      result = result.filter((event) => event.categoryId === activeFilter);
    }

    return result.filter((event) => event.id !== heroEvent?.id);
  }, [activeFilter, heroEvent?.id, preferences.city, scoredEvents]);

  const favoriteSuggestions = useMemo(
    () =>
      scoredEvents
        .filter((event) => !isFavorite(event.id))
        .slice(0, 3)
        .map((event) => ({
          id: event.id,
          title: event.title,
          category: categoryLabelById.get(event.categoryId ?? "") ?? "Recomendado",
        })),
    [categoryLabelById, isFavorite, scoredEvents],
  );

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
                subtitle="Tu cartelera premium, adaptada a tu estilo"
                rightSlot={
                  <View style={styles.searchShortcut}>
                    <Ionicons name="search-outline" size={18} color={colors.textSoft} />
                  </View>
                }
              />
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loaderText}>Preparando recomendaciones...</Text>
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
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudieron cargar los eventos.</Text>
          {detail ? <Text style={styles.errorDetail}>{detail}</Text> : null}
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
              subtitle="Tu cartelera premium, adaptada a tu estilo"
              rightSlot={
                <Pressable
                  style={({ pressed }) => [
                    styles.searchShortcut,
                    pressed && styles.searchShortcutPressed,
                  ]}
                  onPress={() => router.push("/(tabs)/search")}
                >
                  <Ionicons name="search-outline" size={18} color={colors.textSoft} />
                </Pressable>
              }
            />

            <DiscoveryHero
              event={heroEvent}
              city={preferences.city}
              onPressPrimary={() => {
                if (!heroEvent) return;
                router.push(`/event/${heroEvent.id}` as Href);
              }}
              onPressSecondary={() => setShowPreferencesSheet(true)}
            />

            <ConversionBanner
              isLoggedIn={Boolean(user)}
              onPrimaryPress={() => {
                if (user) {
                  setShowPreferencesSheet(true);
                  return;
                }
                router.push("/(tabs)/profile");
              }}
              onSecondaryPress={() => router.push("/(tabs)/search")}
            />

            {favoriteSuggestions.length > 0 ? (
              <View style={styles.recoBox}>
                <Text style={styles.recoTitle}>Sugerencias para guardar</Text>
                {favoriteSuggestions.map((suggestion) => (
                  <View key={suggestion.id} style={styles.recoRow}>
                    <View style={styles.recoDot} />
                    <Text style={styles.recoText} numberOfLines={1}>
                      {suggestion.title}
                    </Text>
                    <Text style={styles.recoTag}>{suggestion.category}</Text>
                  </View>
                ))}
              </View>
            ) : null}

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

      <PersonalizationSheet
        visible={showPreferencesSheet}
        categories={categories ?? []}
        initialCity={preferences.city}
        initialVibeCategoryIds={preferences.vibeCategoryIds}
        onClose={() => setShowPreferencesSheet(false)}
        onSave={async ({ city, vibeCategoryIds }) => {
          await completeOnboarding({ city, vibeCategoryIds });
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, paddingBottom: 36 },
    headerWrap: { paddingBottom: 14, gap: 14 },
    searchShortcut: {
      width: 44,
      height: 44,
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

    recoBox: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 8,
    },
    recoTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: "700",
    },
    recoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    recoDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.brand,
    },
    recoText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    recoTag: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
    },

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
    errorText: {
      color: colors.danger,
      fontSize: 15,
      textAlign: "center",
      marginBottom: 12,
    },
    errorDetail: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 10,
    },
    retryText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
    emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  });
}
