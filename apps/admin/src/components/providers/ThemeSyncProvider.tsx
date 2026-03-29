"use client";

import { useEffect } from "react";
import { initAdminThemeSync } from "@/lib/theme";

export function ThemeSyncProvider() {
  useEffect(() => {
    const cleanup = initAdminThemeSync();
    return cleanup;
  }, []);

  return null;
}
