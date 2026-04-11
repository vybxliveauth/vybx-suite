export const darkColors = {
  bg: "#080b10",
  bgElevated: "#0b0f14",
  surface: "#11161d",
  surfaceMuted: "#10151d",
  surfaceStrong: "#1b2330",
  border: "#1f2937",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textSoft: "#a7b3c1",
  brand: "#0a84ff",
  white: "#ffffff",
  danger: "#ef4444",
  warning: "#f59e0b",
  success: "#16a34a",
  heart: "#ff375f",
} as const;

export const lightColors = {
  bg: "#f3f6fb",
  bgElevated: "#ffffff",
  surface: "#ffffff",
  surfaceMuted: "#edf3fb",
  surfaceStrong: "#e2ebf7",
  border: "#d8e1ef",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textSoft: "#475569",
  brand: "#007aff",
  white: "#ffffff",
  danger: "#dc2626",
  warning: "#d97706",
  success: "#16a34a",
  heart: "#ff375f",
} as const;

export type AppColors = {
  [K in keyof typeof darkColors]: string;
};
export type ThemeVariant = "light" | "dark";

export const themeColors: Record<ThemeVariant, AppColors> = {
  light: lightColors,
  dark: darkColors,
};

export function getThemeColors(theme: ThemeVariant): AppColors {
  return themeColors[theme];
}

// Backward compatible default (dark-first). New code should use useAppTheme().
export const colors: AppColors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  xxl: 18,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
} as const;
