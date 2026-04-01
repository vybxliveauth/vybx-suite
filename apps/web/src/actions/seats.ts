"use server";

import { z } from "zod";

// ─── Input Schema ─────────────────────────────────────────────────────────────

const reserveSeatSchema = z.object({
  seatId: z.string().min(1),
  eventId: z.string().uuid(),
  sessionId: z.string().min(1),
});

// ─── State Shape ──────────────────────────────────────────────────────────────

export type SeatActionState = {
  status: "idle" | "success" | "error";
  seatId?: string;
  message?: string;
};

// ─── Toggle Seat Reservation ──────────────────────────────────────────────────

export async function toggleSeatReservationAction(
  _prevState: SeatActionState,
  formData: FormData
): Promise<SeatActionState> {
  const raw = {
    seatId: formData.get("seatId"),
    eventId: formData.get("eventId"),
    sessionId: formData.get("sessionId"),
  };

  const parsed = reserveSeatSchema.safeParse(raw);

  if (!parsed.success) {
    return { status: "error", message: "Invalid seat selection." };
  }

  const { seatId, eventId, sessionId } = parsed.data;

  void eventId;
  void sessionId;

  // Fail-fast instead of simulating in-memory success. Assigned seating needs a
  // dedicated backend seat-lock API with persistent storage and conflict checks.
  return {
    status: "error",
    seatId,
    message:
      "Assigned seating is not enabled yet. Use tier-based checkout until backend seat locking is available.",
  };
}
