"use client";

import { useEffect, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";
const POLL_INTERVAL_MS = 60_000; // re-check every 60s

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export function useMaintenanceMode() {
  const [active, setActive] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${BASE_URL}/config/MAINTENANCE_MODE`, {
          cache: "no-store",
          credentials: "omit",
          headers: { accept: "application/json" },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as { value?: string | boolean };
        if (!cancelled) setActive(parseBoolean(payload?.value, false));
      } catch {
        // Keep app available if config can't be read
      } finally {
        if (!cancelled) setResolved(true);
      }
    };

    void check();
    const interval = setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { maintenanceMode: active, resolved };
}
