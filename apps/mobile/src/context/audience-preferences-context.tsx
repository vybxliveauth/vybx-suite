import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AudiencePreferences = {
  city: string;
  vibeCategoryIds: string[];
  onboardingCompleted: boolean;
  updatedAt: string | null;
};

type AudiencePreferencesContextValue = {
  preferences: AudiencePreferences;
  isReady: boolean;
  setCity: (city: string) => Promise<void>;
  setVibeCategoryIds: (categoryIds: string[]) => Promise<void>;
  toggleVibeCategoryId: (categoryId: string) => Promise<void>;
  completeOnboarding: (input?: {
    city?: string;
    vibeCategoryIds?: string[];
  }) => Promise<void>;
  resetPreferences: () => Promise<void>;
};

const STORAGE_KEY = "vybx.mobile.audience.preferences";

const defaultPreferences: AudiencePreferences = {
  city: "",
  vibeCategoryIds: [],
  onboardingCompleted: false,
  updatedAt: null,
};

const AudiencePreferencesContext = createContext<AudiencePreferencesContextValue | null>(
  null,
);

function sanitize(input: Partial<AudiencePreferences>): AudiencePreferences {
  const city = typeof input.city === "string" ? input.city.trim().slice(0, 80) : "";
  const vibeCategoryIds = Array.isArray(input.vibeCategoryIds)
    ? Array.from(
        new Set(
          input.vibeCategoryIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ).slice(0, 8)
    : [];

  return {
    city,
    vibeCategoryIds,
    onboardingCompleted: Boolean(input.onboardingCompleted),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
  };
}

async function persistPreferences(preferences: AudiencePreferences) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Keep in-memory values if persistence fails for this session.
  }
}

export function AudiencePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState<AudiencePreferences>(defaultPreferences);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (!raw || !mounted) return;

        const parsed = JSON.parse(raw) as Partial<AudiencePreferences>;
        setPreferences(sanitize(parsed));
      } catch {
        // Ignore malformed or inaccessible storage and keep defaults.
      } finally {
        if (mounted) setIsReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const patchPreferences = useCallback(
    async (patch: Partial<AudiencePreferences>) => {
      setPreferences((current) => {
        const next = sanitize({ ...current, ...patch, updatedAt: new Date().toISOString() });
        void persistPreferences(next);
        return next;
      });
    },
    [],
  );

  const setCity = useCallback(
    async (city: string) => {
      await patchPreferences({ city });
    },
    [patchPreferences],
  );

  const setVibeCategoryIds = useCallback(
    async (categoryIds: string[]) => {
      await patchPreferences({ vibeCategoryIds: categoryIds });
    },
    [patchPreferences],
  );

  const toggleVibeCategoryId = useCallback(
    async (categoryId: string) => {
      if (!categoryId.trim()) return;
      setPreferences((current) => {
        const hasCategory = current.vibeCategoryIds.includes(categoryId);
        const nextIds = hasCategory
          ? current.vibeCategoryIds.filter((value) => value !== categoryId)
          : [...current.vibeCategoryIds, categoryId];

        const next = sanitize({
          ...current,
          vibeCategoryIds: nextIds,
          updatedAt: new Date().toISOString(),
        });

        void persistPreferences(next);
        return next;
      });
    },
    [],
  );

  const completeOnboarding = useCallback(
    async (input?: { city?: string; vibeCategoryIds?: string[] }) => {
      await patchPreferences({
        city: input?.city,
        vibeCategoryIds: input?.vibeCategoryIds,
        onboardingCompleted: true,
      });
    },
    [patchPreferences],
  );

  const resetPreferences = useCallback(async () => {
    setPreferences(defaultPreferences);
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures.
    }
  }, []);

  const value = useMemo<AudiencePreferencesContextValue>(
    () => ({
      preferences,
      isReady,
      setCity,
      setVibeCategoryIds,
      toggleVibeCategoryId,
      completeOnboarding,
      resetPreferences,
    }),
    [completeOnboarding, isReady, preferences, resetPreferences, setCity, setVibeCategoryIds, toggleVibeCategoryId],
  );

  return (
    <AudiencePreferencesContext.Provider value={value}>
      {children}
    </AudiencePreferencesContext.Provider>
  );
}

export function useAudiencePreferences() {
  const context = useContext(AudiencePreferencesContext);
  if (!context) {
    throw new Error(
      "useAudiencePreferences must be used within <AudiencePreferencesProvider>",
    );
  }
  return context;
}
