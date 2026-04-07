"use client";

import { useEffect } from "react";
import { initStaffThemeSync } from "@/lib/theme";

export function ThemeSyncProvider() {
  useEffect(() => {
    const cleanup = initStaffThemeSync();
    return cleanup;
  }, []);
  return null;
}
