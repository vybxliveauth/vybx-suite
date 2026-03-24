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

export const seatInitialState: SeatActionState = { status: "idle" };

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

  try {
    // TODO: validate seat is still available in DB, lock it for this session
    await new Promise((r) => setTimeout(r, 300)); // simulate round-trip

    console.log(`[toggleSeat] seat=${seatId} event=${eventId} session=${sessionId}`);

    return { status: "success", seatId };
  } catch {
    return { status: "error", seatId, message: "Seat no longer available." };
  }
}
