const THEME_KEY = "vybx.staff.theme";
type Pref = "system" | "dark" | "light";

function resolveIsDark(pref: Pref): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyStaffTheme(pref: Pref): void {
  if (typeof document === "undefined") return;
  const isDark = resolveIsDark(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.dataset.theme = isDark ? "dark" : "light";
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function initStaffThemeSync(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const pref = (localStorage.getItem(THEME_KEY) as Pref) ?? "dark";
  applyStaffTheme(pref);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if ((localStorage.getItem(THEME_KEY) ?? "dark") === "system") applyStaffTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
