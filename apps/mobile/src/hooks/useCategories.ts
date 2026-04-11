import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { reportMobileError } from "../lib/observability";

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
    queryFn: async () => {
      try {
        return await api.get<Category[]>("/categories/active");
      } catch (error) {
        reportMobileError(
          "mobile_categories_load_failed",
          { endpoint: "/categories/active" },
          error,
        );
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10,
  });
}
