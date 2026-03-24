"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNotificationsStore } from "@/store/notifications";

/**
 * Initializes global stores once at the protected layout boundary.
 * - Auth profile is fetched once and cached for the whole session.
 * - Notification polling starts once and persists across page navigations.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const initAuth        = useAuthStore((s) => s.init);
  const startPolling    = useNotificationsStore((s) => s.startPolling);
  const stopPolling     = useNotificationsStore((s) => s.stopPolling);

  useEffect(() => {
    void initAuth();
    startPolling(60_000);
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
