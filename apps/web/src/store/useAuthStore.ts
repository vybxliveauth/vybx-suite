import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type AuthUser, fetchProfile, logout as apiLogout } from "@/lib/api";

/**
 * Only persist display-safe fields to localStorage.
 * Sensitive fields (role, email) are kept in memory and
 * reconstructed from the server on every rehydrate().
 */
type PersistedUser = Pick<AuthUser, "id" | "firstName" | "lastName" | "profileImageUrl">;

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
      partialize: (state): { user: PersistedUser | null } => {
        if (!state.user) return { user: null };
        // Only persist display fields — role, email, emailVerified stay in memory
        return {
          user: {
            id: state.user.id,
            firstName: state.user.firstName,
            lastName: state.user.lastName,
            profileImageUrl: state.user.profileImageUrl,
          },
        };
      },
    }
  )
);
