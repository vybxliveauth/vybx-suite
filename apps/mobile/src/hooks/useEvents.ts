import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  date: string;
  status: string;
  isFeatured?: boolean;
  categoryId: string | null;
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
  }>;
}

interface EventsResponse {
  data: PublicEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export function useEvents(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["events", page, pageSize],
    queryFn: () =>
      api.get<EventsResponse>(
        `/events?page=${page}&limit=${pageSize}&status=APPROVED`,
      ),
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => api.get<PublicEvent>(`/events/${id}`),
    enabled: Boolean(id),
  });
}
