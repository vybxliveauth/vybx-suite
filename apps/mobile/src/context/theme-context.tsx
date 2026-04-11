import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import {
  getThemeColors,
  type AppColors,
  type ThemeVariant,
} from "../theme/tokens";

type ThemeMode = "system" | ThemeVariant;

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ThemeVariant;
  colors: AppColors;
  setMode: (nextMode: ThemeMode) => Promise<void>;
  isReady: boolean;
};

const THEME_MODE_STORAGE_KEY = "vybx.mobile.theme.mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeThemeMode(value: string | null): ThemeMode | null {
  if (value === "system" || value === "light" || value === "dark") {
    return value;
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const persisted = await SecureStore.getItemAsync(THEME_MODE_STORAGE_KEY);
        const normalized = normalizeThemeMode(persisted);
        if (normalized && isMounted) {
          setModeState(normalized);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const resolvedTheme: ThemeVariant =
    mode === "system" ? (systemColorScheme === "light" ? "light" : "dark") : mode;

  const colors = useMemo(() => getThemeColors(resolvedTheme), [resolvedTheme]);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await SecureStore.setItemAsync(THEME_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Silent fail: theme can still apply in-memory for current session.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      colors,
      setMode,
      isReady,
    }),
    [colors, isReady, mode, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used inside <ThemeProvider>");
  }
  return context;
}

export type { ThemeMode };
