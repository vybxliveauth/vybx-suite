import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, CheckoutSession } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESERVATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // SSR fallback
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function calculateTotals(items: CartItem[]): {
  subtotal: number;
  fees: number;
  total: number;
} {
  const subtotal = items.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  );
  const fees = Math.round(subtotal * 0.05); // 5% service fee
  return { subtotal, fees, total: subtotal + fees };
}

function buildSession(items: CartItem[]): CheckoutSession {
  const now = Date.now();
  const { subtotal, fees, total } = calculateTotals(items);
  const currency = items[0]?.currency ?? "USD";

  return {
    id: generateSessionId(),
    items,
    subtotal,
    fees,
    total,
    currency,
    reservedAt: now,
    expiresAt: now + RESERVATION_TTL_MS,
    isExpired: false,
  };
}

// ─── Store Types ──────────────────────────────────────────────────────────────

interface CartStore {
  session: CheckoutSession | null;
  timerIntervalId: ReturnType<typeof setInterval> | null;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (tierId: string, eventId: string) => void;
  updateQuantity: (tierId: string, eventId: string, quantity: number) => void;
  clearCart: () => void;
  checkExpiry: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  isReservationActive: () => boolean;
  remainingSeconds: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      session: null,
      timerIntervalId: null,

      addItem: (item) => {
        const { session, startTimer } = get();
        const existingItems = session?.items ?? [];

        const alreadyExists = existingItems.find(
          (i) => i.tierId === item.tierId && i.eventId === item.eventId
        );

        const updatedItems: CartItem[] = alreadyExists
          ? existingItems.map((i) =>
              i.tierId === item.tierId && i.eventId === item.eventId
                ? {
                    ...i,
                    quantity: Math.min(
                      i.quantity + item.quantity,
                      item.quantity // respect maxPerOrder — caller enforces this
                    ),
                  }
                : i
            )
          : [...existingItems, item];

        const newSession = buildSession(updatedItems);

        set({ session: newSession });
        startTimer();
      },

      removeItem: (tierId, eventId) => {
        const { session } = get();
        if (!session) return;

        const updatedItems = session.items.filter(
          (i) => !(i.tierId === tierId && i.eventId === eventId)
        );

        if (updatedItems.length === 0) {
          get().clearCart();
          return;
        }

        set({ session: buildSession(updatedItems) });
      },

      updateQuantity: (tierId, eventId, quantity) => {
        const { session } = get();
        if (!session) return;

        if (quantity <= 0) {
          get().removeItem(tierId, eventId);
          return;
        }

        const updatedItems = session.items.map((i) =>
          i.tierId === tierId && i.eventId === eventId
            ? { ...i, quantity }
            : i
        );

        set({ session: buildSession(updatedItems) });
      },

      clearCart: () => {
        get().stopTimer();
        set({ session: null });
      },

      checkExpiry: () => {
        const { session } = get();
        if (!session) return;

        const now = Date.now();
        if (now >= session.expiresAt && !session.isExpired) {
          set({
            session: { ...session, isExpired: true },
          });
          get().stopTimer();
        }
      },

      startTimer: () => {
        const { timerIntervalId, stopTimer } = get();
        if (timerIntervalId) stopTimer(); // reset existing timer

        const id = setInterval(() => {
          get().checkExpiry();
        }, 1000);

        set({ timerIntervalId: id });
      },

      stopTimer: () => {
        const { timerIntervalId } = get();
        if (timerIntervalId) {
          clearInterval(timerIntervalId);
          set({ timerIntervalId: null });
        }
      },

      isReservationActive: () => {
        const { session } = get();
        if (!session) return false;
        return !session.isExpired && Date.now() < session.expiresAt;
      },

      remainingSeconds: () => {
        const { session } = get();
        if (!session) return 0;
        const remaining = Math.max(0, session.expiresAt - Date.now());
        return Math.floor(remaining / 1000);
      },
    }),
    {
      name: "vybx-cart",
      storage: createJSONStorage(() => sessionStorage),
      // Do NOT persist the timer interval ID — it's a runtime value
      partialize: (state) => ({
        session: state.session,
      }),
      // On rehydration, check if the session is already expired
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const now = Date.now();
        if (state.session && now >= state.session.expiresAt) {
          state.session = { ...state.session, isExpired: true };
        } else if (state.session) {
          // Session still valid — restart the countdown timer
          state.startTimer();
        }
      },
    }
  )
);
