import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { type AppColors, type ThemeVariant } from "../../src/theme/tokens";
import { useMyTickets, type MyTicket } from "../../src/hooks/useMyTickets";
import { useAuth } from "../../src/context/auth-context";
import { Link } from "expo-router";
import { AppScreenHeader } from "../../src/components/AppScreenHeader";
import { useEffect, useMemo, useRef } from "react";
import { useAppTheme } from "../../src/context/theme-context";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function TicketCard({
  ticket,
  styles,
}: {
  ticket: MyTicket;
  styles: ReturnType<typeof createStyles>;
}) {
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

function TicketCardSkeleton() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.ticketSkeletonCard, { opacity: pulse }]}>
      <View style={styles.ticketSkeletonImage} />
      <View style={styles.ticketSkeletonBody}>
        <View style={styles.ticketSkeletonTitle} />
        <View style={styles.ticketSkeletonSubtitle} />
        <View style={styles.ticketSkeletonSubtitleShort} />
      </View>
    </Animated.View>
  );
}

export default function TicketsScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, resolvedTheme),
    [colors, resolvedTheme],
  );
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const { data, isLoading, isError, refetch, isFetching } =
    useMyTickets(isAuthenticated);

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AppScreenHeader
            title="Mis Boletos"
            subtitle="Tus entradas en un solo lugar"
          />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔒</Text>
          <Text style={styles.emptyTitle}>Inicia sesión para ver tus boletos</Text>
          <Text style={styles.emptySubtitle}>
            Ve a Mi Cuenta para entrar o crear tu cuenta.
          </Text>
          <Link href="/(tabs)/profile" asChild>
            <Pressable style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Ir a Mi Cuenta</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `ticket-skeleton-${item}`}
          renderItem={() => <TicketCardSkeleton />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <AppScreenHeader
                title="Mis Boletos"
                subtitle="Tus entradas en un solo lugar"
              />
              <View style={styles.loaderRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loaderText}>Cargando boletos...</Text>
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
        <View style={styles.header}>
          <AppScreenHeader
            title="Mis Boletos"
            subtitle="Tus entradas en un solo lugar"
          />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudieron cargar tus boletos.</Text>
          <Text style={styles.retryText} onPress={() => void refetch()}>
            Reintentar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const tickets = data?.data ?? [];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TicketCard ticket={item} styles={styles} />}
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
              title="Mis Boletos"
              subtitle="Tus entradas en un solo lugar"
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyTitle}>Sin boletos aún</Text>
            <Text style={styles.emptySubtitle}>
              Tus entradas compradas aparecerán aquí.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors, resolvedTheme: ThemeVariant) {
  const skeletonColor = resolvedTheme === "dark" ? "#2a3443" : "#d3dced";
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    list: { padding: 16, paddingBottom: 36 },
    header: { paddingBottom: 16 },
    separator: { height: 12 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
    loaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    loaderText: { color: colors.textSecondary, fontSize: 13 },
    errorText: {
      color: colors.danger,
      fontSize: 15,
      textAlign: "center",
      marginBottom: 12,
    },
    retryText: { color: colors.brand, fontSize: 14, fontWeight: "700" },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 8,
    },
    emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
    ctaButton: {
      marginTop: 14,
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    ctaButtonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardUsed: { opacity: 0.55 },
    eventImage: { width: "100%", height: 120 },
    cardBody: { padding: 14, gap: 6 },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 8,
    },
    eventTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      lineHeight: 22,
    },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeActive: { backgroundColor: colors.success },
    badgeUsed: { backgroundColor: colors.textMuted },
    badgeText: { color: colors.white, fontSize: 11, fontWeight: "700" },
    ticketType: { fontSize: 13, color: colors.brand, fontWeight: "600" },
    date: { fontSize: 13, color: colors.textSecondary },
    location: { fontSize: 13, color: colors.textMuted },
    qrSection: {
      marginTop: 8,
      backgroundColor: colors.bg,
      borderRadius: 8,
      padding: 10,
      gap: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qrLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: "600",
      textTransform: "uppercase",
    },
    qrCode: { fontSize: 12, color: colors.brand, fontFamily: "monospace" },
    ticketSkeletonCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    ticketSkeletonImage: { height: 120, backgroundColor: colors.surfaceStrong },
    ticketSkeletonBody: { padding: 14, gap: 10 },
    ticketSkeletonTitle: {
      height: 18,
      borderRadius: 8,
      backgroundColor: skeletonColor,
      width: "80%",
    },
    ticketSkeletonSubtitle: {
      height: 14,
      borderRadius: 999,
      backgroundColor: skeletonColor,
      width: "58%",
    },
    ticketSkeletonSubtitleShort: {
      height: 14,
      borderRadius: 999,
      backgroundColor: skeletonColor,
      width: "42%",
    },
  });
}
