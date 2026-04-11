import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { reportMobileError } from "../lib/observability";

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
    queryFn: async () => {
      try {
        return await api.get<MyTicketsResponse>("/tickets/my-tickets");
      } catch (error) {
        reportMobileError(
          "mobile_tickets_load_failed",
          { endpoint: "/tickets/my-tickets" },
          error,
        );
        throw error;
      }
    },
    staleTime: 1000 * 30, // 30s — tickets state changes often
    enabled,
  });
}
