"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function useUrlQuery() {
  const router      = useRouter();
  const pathname    = usePathname();
  const params      = useSearchParams();
  const [, startTransition] = useTransition();

  const set = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      // Reset to page 1 when any filter changes (unless explicitly setting page)
      if (!("page" in updates)) next.set("page", "1");
      startTransition(() => router.push(`${pathname}?${next.toString()}`));
    },
    [router, pathname, params],
  );

  const get = useCallback(
    (key: string, fallback = "") => params.get(key) ?? fallback,
    [params],
  );

  return { set, get, params };
}
