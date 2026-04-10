import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Category {
  id: string;
  name: string;
  icon?: string | null;
  order?: number;
  isActive?: boolean;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories-active"],
    queryFn: () => api.get<Category[]>("/categories/active"),
    staleTime: 1000 * 60 * 10,
  });
}

