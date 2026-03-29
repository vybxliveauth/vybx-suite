"use client";

import { useEffect } from "react";
import { initPromoterThemeSync } from "@/lib/theme";

export function ThemeSyncProvider() {
  useEffect(() => {
    const cleanup = initPromoterThemeSync();
    return cleanup;
  }, []);

  return null;
}
