"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEvents, fetchEventById } from "@/lib/api";

export function useEvents(page = 1, limit = 20, search?: string) {
  return useQuery({
    queryKey: ["events", page, limit, search],
    queryFn: () => fetchEvents({ page, limit, search }),
    retry: 1,
    throwOnError: false,
    staleTime: 30_000, // 30s — inventory can change fast
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchEventById(id),
    staleTime: 15_000,
    enabled: !!id,
  });
}
