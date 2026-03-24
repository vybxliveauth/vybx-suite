import { create } from "zustand";
import { auth } from "@/lib/api";
import type { Profile } from "@/lib/types";

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  /** Call once — subsequent calls are no-ops while loading or already loaded */
  init: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  loading: false,

  init: async () => {
    // Already loaded or currently loading — skip
    if (get().profile || get().loading) return;

    set({ loading: true });
    try {
      const p = await auth.profile();
      set({ profile: p as Profile });
    } catch {
      // Session invalid — let the 401 handler in api.ts redirect to /login
    } finally {
      set({ loading: false });
    }
  },

  clear: () => set({ profile: null, loading: false }),
}));
