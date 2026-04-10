import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "./auth-context";
import { api } from "../lib/api";

type FavoritesContextValue = {
  favoriteIds: Set<string>;
  hydrated: boolean;
  isFavorite(eventId: string): boolean;
  toggleFavorite(eventId: string): void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

const LEGACY_KEY = "vybx_favorite_event_ids_v1";
const GUEST_KEY = "vybx_favorite_event_ids_guest_v1";

type FavoritesApiResponse = { favoriteEventIds?: string[] };

function userStorageKey(userId: string) {
  return `vybx_favorite_event_ids_user_${userId}_v1`;
}

function toIdSet(input: unknown): Set<string> {
  if (!Array.isArray(input)) return new Set();
  return new Set(input.filter((item): item is string => typeof item === "string"));
}

async function saveFavorites(storageKey: string, ids: Set<string>) {
  try {
    const payload = JSON.stringify(Array.from(ids));
    await SecureStore.setItemAsync(storageKey, payload);
  } catch {
    // best effort persistence
  }
}

async function loadFavorites(storageKey: string): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(storageKey);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

async function migrateLegacyFavorites() {
  try {
    const [legacyRaw, guestRaw] = await Promise.all([
      SecureStore.getItemAsync(LEGACY_KEY),
      SecureStore.getItemAsync(GUEST_KEY),
    ]);

    if (!legacyRaw) return;
    if (guestRaw) {
      await SecureStore.deleteItemAsync(LEGACY_KEY);
      return;
    }

    await SecureStore.setItemAsync(GUEST_KEY, legacyRaw);
    await SecureStore.deleteItemAsync(LEGACY_KEY);
  } catch {
    // best effort migration
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [keyHydrated, setKeyHydrated] = useState(false);

  const favoriteIdsRef = useRef<Set<string>>(new Set());
  const authUserIdRef = useRef<string | null>(null);

  const authUserId = status === "authenticated" ? user?.userId ?? null : null;
  const storageKey = authUserId ? userStorageKey(authUserId) : GUEST_KEY;

  useEffect(() => {
    authUserIdRef.current = authUserId;
  }, [authUserId]);

  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);

  useEffect(() => {
    void migrateLegacyFavorites();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateForStorageKey() {
      setHydrated(false);
      setKeyHydrated(false);

      const stored = await loadFavorites(storageKey);
      if (cancelled) return;

      setFavoriteIds(stored);
      favoriteIdsRef.current = stored;
      setKeyHydrated(true);
      setHydrated(true);
    }

    void hydrateForStorageKey();
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!keyHydrated || !authUserId) return;

    let cancelled = false;

    async function syncWithServer() {
      setHydrated(false);
      try {
        const remote = await api.get<FavoritesApiResponse>("/users/me/favorites");
        let serverIds = toIdSet(remote.favoriteEventIds);

        const localIds = Array.from(favoriteIdsRef.current);
        for (const eventId of localIds) {
          if (serverIds.has(eventId)) continue;
          const updated = await api.post<FavoritesApiResponse>(
            `/users/me/favorites/${eventId}`,
          );
          serverIds = toIdSet(updated.favoriteEventIds);
        }

        if (cancelled) return;

        setFavoriteIds(serverIds);
        favoriteIdsRef.current = serverIds;
        await saveFavorites(storageKey, serverIds);
      } catch {
        // keep local state as fallback if server sync fails
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void syncWithServer();
    return () => {
      cancelled = true;
    };
  }, [keyHydrated, authUserId, storageKey]);

  const isFavorite = useCallback(
    (eventId: string) => favoriteIds.has(eventId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback((eventId: string) => {
    const activeUserId = authUserIdRef.current;
    const activeStorageKey = activeUserId ? userStorageKey(activeUserId) : GUEST_KEY;

    const previous = new Set(favoriteIdsRef.current);
    const currentlyFavorite = previous.has(eventId);
    const optimistic = new Set(previous);

    if (currentlyFavorite) {
      optimistic.delete(eventId);
    } else {
      optimistic.add(eventId);
    }

    setFavoriteIds(optimistic);
    favoriteIdsRef.current = optimistic;
    void saveFavorites(activeStorageKey, optimistic);

    if (!activeUserId) return;

    void (async () => {
      try {
        const response = currentlyFavorite
          ? await api.delete<FavoritesApiResponse>(`/users/me/favorites/${eventId}`)
          : await api.post<FavoritesApiResponse>(`/users/me/favorites/${eventId}`);

        if (authUserIdRef.current !== activeUserId) return;

        const synced = toIdSet(response.favoriteEventIds);
        setFavoriteIds(synced);
        favoriteIdsRef.current = synced;
        await saveFavorites(activeStorageKey, synced);
      } catch {
        if (authUserIdRef.current !== activeUserId) return;

        setFavoriteIds(previous);
        favoriteIdsRef.current = previous;
        await saveFavorites(activeStorageKey, previous);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({ favoriteIds, hydrated, isFavorite, toggleFavorite }),
    [favoriteIds, hydrated, isFavorite, toggleFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
