import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  DashboardResponse,
  PaginatedResponse,
  Event,
  EventDetail,
  EventAnalyticsResponse,
} from "./types";

// ── Query keys ────────────────────────────────────────────────────────────────
export const qk = {
  dashboard:      ["dashboard"]                              as const,
  events:         (page: number, pageSize: number) =>
                    ["events", page, pageSize]               as const,
  event:          (id: string) => ["event", id]             as const,
  eventAnalytics: (id: string) => ["event-analytics", id]   as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn:  () => api.get<DashboardResponse>("/promoter/dashboard"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEvents(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: qk.events(page, pageSize),
    queryFn:  () =>
      api.get<PaginatedResponse<Event>>(
        `/promoter/events?page=${page}&pageSize=${pageSize}`
      ),
  });
}

export function useEventDetail(id: string) {
  return useQuery({
    queryKey: qk.event(id),
    queryFn:  () => api.get<EventDetail>(`/promoter/events/${id}`),
    enabled:  !!id,
    staleTime: 60 * 1000,
  });
}

export function useEventAnalytics(id: string) {
  return useQuery({
    queryKey: qk.eventAnalytics(id),
    queryFn:  () =>
      api.get<EventAnalyticsResponse>(`/promoter/events/${id}/analytics`),
    enabled:  !!id,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useToggleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/events/${id}/status`, { isActive }),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: qk.event(id) }),
  });
}

export function useDuplicateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<EventDetail>(`/promoter/events/${id}/duplicate`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
