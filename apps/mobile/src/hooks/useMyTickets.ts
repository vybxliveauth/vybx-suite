import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface MyTicket {
  id: string;
  status: string;
  qrCode: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  ticketType: {
    id: string;
    name: string;
    price: number;
    event: {
      id: string;
      title: string;
      date: string;
      location: string | null;
      image: string | null;
    };
  };
}

interface MyTicketsResponse {
  data: MyTicket[];
  total: number;
  page: number;
  pageSize: number;
}

export function useMyTickets(enabled = true) {
  return useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => api.get<MyTicketsResponse>("/tickets/my-tickets"),
    staleTime: 1000 * 30, // 30s — tickets state changes often
    enabled,
  });
}
