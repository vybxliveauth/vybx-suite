export type PromoterThemePreference = "system" | "dark" | "light";

const THEME_STORAGE_KEY = "vybx.promoter.theme";

function resolveIsDark(preference: PromoterThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readPromoterThemePreference(): PromoterThemePreference {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return "system";
}

export function applyPromoterTheme(preference: PromoterThemePreference): void {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(preference);
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.dataset.theme = isDark ? "dark" : "light";
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function setPromoterThemePreference(preference: PromoterThemePreference): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }
  applyPromoterTheme(preference);
}

export function initPromoterThemeSync(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const initial = readPromoterThemePreference();
  applyPromoterTheme(initial);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readPromoterThemePreference() === "system") {
      applyPromoterTheme("system");
    }
  };

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }

  media.addListener(onSystemChange);
  return () => media.removeListener(onSystemChange);
}
