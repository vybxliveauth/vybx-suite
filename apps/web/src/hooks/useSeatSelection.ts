"use client";

import { useActionState, useOptimistic, startTransition } from "react";
import {
  toggleSeatReservationAction,
  seatInitialState,
  type SeatActionState,
} from "@/actions/seats";
import { Seat, SeatStatus } from "@/types";

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
  };
}
