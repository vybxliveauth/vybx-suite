import { create } from "zustand";
import { api } from "@/lib/api";

export interface NotifCounts {
  pendingApplications: number;
  pendingCancellations: number;
  pendingTransactions: number;
  pendingEvents: number;
}

interface NotificationsState {
  counts: NotifCounts;
  total: number;
  loading: boolean;
  /** Fetch latest counts from the API */
  refresh: () => Promise<void>;
  /** Start auto-refresh every `intervalMs` ms (default 60 s). Idempotent. */
  startPolling: (intervalMs?: number) => void;
  /** Stop auto-refresh */
  stopPolling: () => void;
  _timerId: ReturnType<typeof setInterval> | null;
}

const EMPTY: NotifCounts = {
  pendingApplications: 0,
  pendingCancellations: 0,
  pendingTransactions: 0,
  pendingEvents: 0,
};

function readTotal(v: unknown): number {
  if (!v || typeof v !== "object") return 0;
  const p = (v as { pagination?: { total?: number } }).pagination;
  return Math.max(0, Number(p?.total ?? 0));
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  counts: EMPTY,
  total: 0,
  loading: false,
  _timerId: null,

  refresh: async () => {
    set({ loading: true });
    const [apps, cancels, txs, events] = await Promise.allSettled([
      api.get<unknown>("/users/promoter-applications?status=PENDING_APPROVAL&page=1&limit=1"),
      api.get<unknown>("/tickets/cancellations/admin?status=REQUESTED&page=1&limit=1"),
      api.get<unknown>("/admin/transactions?status=PENDING&page=1&limit=1"),
      api.get<unknown>("/events/admin/all?status=PENDING&page=1&limit=1"),
    ]);

    const counts: NotifCounts = {
      pendingApplications:  apps.status    === "fulfilled" ? readTotal(apps.value)    : 0,
      pendingCancellations: cancels.status === "fulfilled" ? readTotal(cancels.value) : 0,
      pendingTransactions:  txs.status     === "fulfilled" ? readTotal(txs.value)     : 0,
      pendingEvents:        events.status  === "fulfilled" ? readTotal(events.value)  : 0,
    };

    const total =
      counts.pendingApplications +
      counts.pendingCancellations +
      counts.pendingTransactions +
      counts.pendingEvents;

    set({ counts, total, loading: false });
  },

  startPolling: (intervalMs = 60_000) => {
    // Already polling — skip
    if (get()._timerId !== null) return;

    // Initial fetch
    void get().refresh();

    const id = setInterval(() => void get().refresh(), intervalMs);
    set({ _timerId: id });
  },

  stopPolling: () => {
    const id = get()._timerId;
    if (id !== null) clearInterval(id);
    set({ _timerId: null });
  },
}));
