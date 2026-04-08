import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  PromoterProfile,
  DashboardResponse,
  PaginatedResponse,
  Event,
  EventDetail,
  EventAnalyticsResponse,
  EventChartsResponse,
  RefundRequest,
  RefundStatus,
} from "./types";

// ── Query keys ────────────────────────────────────────────────────────────────
export const qk = {
  profile:        ["profile"]                                as const,
  dashboard:      ["dashboard"]                              as const,
  events:         (page: number, pageSize: number) =>
                    ["events", page, pageSize]               as const,
  event:          (id: string) => ["event", id]             as const,
  eventAnalytics: (id: string) => ["event-analytics", id]   as const,
  eventCharts:    (id: string, days: number) => ["event-charts", id, days] as const,
  categoriesActive: ["categories", "active"]                as const,
};

export interface ActiveCategory {
  id: string;
  name: string;
  icon: string | null;
  order: number;
  isActive: boolean;
}

// ── Queries ───────────────────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn:  () => api.get<DashboardResponse>("/promoter/dashboard"),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePromoterProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: () => api.get<PromoterProfile>("/auth/profile"),
    staleTime: 2 * 60 * 1000,
  });
}

export function useEvents(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: qk.events(page, pageSize),
    queryFn:  () =>
      api.get<PaginatedResponse<Event>>(
        `/promoter/events?page=${page}&limit=${pageSize}`
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

export function useEventCharts(id: string, days = 30) {
  return useQuery({
    queryKey: qk.eventCharts(id, days),
    queryFn:  () =>
      api.get<EventChartsResponse>(`/promoter/events/${id}/charts?days=${days}`),
    enabled:  !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActiveCategories() {
  return useQuery({
    queryKey: qk.categoriesActive,
    queryFn: () => api.get<ActiveCategory[]>("/categories/active"),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/promoter/events/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useToggleEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/promoter/events/${id}/status`, { isActive }),
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

export function useRefunds(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["refunds", page, limit],
    queryFn:  () =>
      api.get<{ total: number; data: RefundRequest[] }>(
        `/promoter/refunds?page=${page}&limit=${limit}`
      ),
  });
}

// Re-export so pages that import from queries still work
export type { RefundStatus, RefundRequest };
