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

type BackendTicketType = {
  id: string;
  name: string;
  price: number | string;
  quantity: number;
  sold: number;
};

type BackendEvent = {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  location: string | null;
  date: string;
  status: string;
  isFeatured?: boolean;
  categoryId: string | null;
  ticketTypes?: BackendTicketType[];
};

function toSafeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizePublicEvent(raw: BackendEvent): PublicEvent {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    image: raw.image ?? null,
    location: raw.location ?? null,
    date: raw.date,
    status: raw.status,
    isFeatured: Boolean(raw.isFeatured),
    categoryId: raw.categoryId ?? null,
    ticketTypes: (raw.ticketTypes ?? []).map((ticketType) => ({
      id: ticketType.id,
      name: ticketType.name,
      price: toSafeNumber(ticketType.price),
      quantity: ticketType.quantity,
      sold: ticketType.sold,
    })),
  };
}

export function useEvents(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["events", page, pageSize],
    queryFn: async () => {
      const response = await api.get<{
        data: BackendEvent[];
        total: number;
        page: number;
        pageSize: number;
      }>(`/events?page=${page}&limit=${pageSize}&status=APPROVED`);

      return {
        ...response,
        data: (response.data ?? []).map(normalizePublicEvent),
      } satisfies EventsResponse;
    },
    staleTime: 1000 * 60 * 2, // 2 min
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const response = await api.get<BackendEvent>(`/events/${id}`);
      return normalizePublicEvent(response);
    },
    enabled: Boolean(id),
  });
}
