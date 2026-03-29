import { z } from "zod";

// ─── UUID ─────────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid("Invalid ID format");

// ─── Currency ─────────────────────────────────────────────────────────────────

export const currencyCodeSchema = z
  .string()
  .length(3, "Currency must be a 3-letter ISO 4217 code")
  .toUpperCase();

// ─── Phone ────────────────────────────────────────────────────────────────────

export const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{7,14}$/,
    "Please enter a valid phone number (e.g. +1234567890)"
  )
  .optional()
  .or(z.literal(""));

// ─── Name ─────────────────────────────────────────────────────────────────────

export const nameSchema = (field: string) =>
  z
    .string()
    .min(2, `${field} must be at least 2 characters`)
    .max(50, `${field} cannot exceed 50 characters`)
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, `${field} contains invalid characters`);

// ─── Email ────────────────────────────────────────────────────────────────────

export const emailSchema = z.string().email("Please enter a valid email address").toLowerCase().trim();

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(120).optional(),
  cursor: z.string().optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
