import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type AuthUser, fetchProfile, logout as apiLogout } from "@/lib/api";

interface AuthStore {
  user: AuthUser | null;
  hydrated: boolean;

  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,

      setUser: (user) => set({ user }),

      logout: async () => {
        try { await apiLogout(); } catch { /* ignore */ }
        set({ user: null });
      },

      rehydrate: async () => {
        try {
          const user = await fetchProfile();
          set({ user, hydrated: true });
        } catch {
          set({ user: null, hydrated: true });
        }
      },
    }),
    {
      name: "vybx-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
