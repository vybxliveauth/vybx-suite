"use client";

import { useActionState, useEffect, useOptimistic, startTransition } from "react";
import {
  toggleSeatReservationAction,
  type SeatActionState,
} from "@/actions/seats";
import { Seat, SeatStatus } from "@/types";

export const SEAT_ACTION_FEEDBACK_EVENT = "vybx:seat-action-feedback";
export type { SeatActionState };
const seatInitialState: SeatActionState = { status: "idle" };

// ─── Optimistic Seat Reducer ──────────────────────────────────────────────────

type OptimisticSeatMap = Record<string, SeatStatus>;

function optimisticSeatReducer(
  current: OptimisticSeatMap,
  update: { seatId: string; nextStatus: SeatStatus }
): OptimisticSeatMap {
  return { ...current, [update.seatId]: update.nextStatus };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSeatSelection(
  eventId: string,
  sessionId: string,
  initialSeats: Seat[]
) {
  // Server action state — tracks last server response
  const [actionState, formAction, isPending] = useActionState<
    SeatActionState,
    FormData
  >(toggleSeatReservationAction, seatInitialState);

  // Build initial status map from server-provided seat list
  const initialStatusMap = initialSeats.reduce<OptimisticSeatMap>(
    (acc, seat) => ({ ...acc, [seat.id]: seat.status }),
    {}
  );

  // Optimistic state — updates immediately before server responds
  const [optimisticStatuses, applyOptimistic] = useOptimistic(
    initialStatusMap,
    optimisticSeatReducer
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (actionState.status === "idle" || !actionState.message) return;

    window.dispatchEvent(
      new CustomEvent<SeatActionState>(SEAT_ACTION_FEEDBACK_EVENT, {
        detail: actionState,
      }),
    );
  }, [actionState]);

  // ─── Toggle a seat ──────────────────────────────────────────────────────────

  function toggleSeat(seatId: string) {
    const currentStatus = optimisticStatuses[seatId];

    // Only allow toggling available or locally-reserved seats
    if (currentStatus === "sold") return;

    const nextStatus: SeatStatus =
      currentStatus === "reserved" ? "available" : "reserved";

    startTransition(() => {
      // 1. Optimistic update — instant feedback
      applyOptimistic({ seatId, nextStatus });

      // 2. Server Action — validate and persist
      const fd = new FormData();
      fd.set("seatId", seatId);
      fd.set("eventId", eventId);
      fd.set("sessionId", sessionId);
      formAction(fd);
    });
  }

  return {
    optimisticStatuses, // Record<seatId, SeatStatus> — use this to render
    toggleSeat,
    isPending,
    actionState,
    actionMessage: actionState.message,
  };
}
