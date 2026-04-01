import { z } from "zod";
import { uuidSchema, currencyCodeSchema, phoneSchema, nameSchema, emailSchema } from "./common";

// Limits — keep in sync with create-cart-payment-intent.dto.ts in the backend.
export const CART_MAX_QUANTITY_PER_TIER = 10;
export const CART_MAX_TIERS = 10;

// ─── Attendee Info ────────────────────────────────────────────────────────────

export const attendeeSchema = z.object({
  firstName: nameSchema("First name"),
  lastName: nameSchema("Last name"),
  email: emailSchema,
  phone: phoneSchema,
});

export type AttendeeFormData = z.infer<typeof attendeeSchema>;

// ─── Payment ──────────────────────────────────────────────────────────────────
// Used only for Stripe Elements flow (client-side tokenization).
// Not required when using hosted checkout pages (Stripe Checkout).

export const paymentSchema = z.object({
  paymentIntentId: z
    .string()
    .min(1, "Payment information is required")
    .startsWith("pi_", "Invalid payment intent"),
  savePaymentMethod: z.boolean().default(false),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;

// ─── Cart Item (full schema — for UI validation) ──────────────────────────────

export const cartItemSchema = z.object({
  eventId: uuidSchema,
  tierId: uuidSchema,
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(CART_MAX_QUANTITY_PER_TIER, `Maximum ${CART_MAX_QUANTITY_PER_TIER} tickets per tier`),
  unitPrice: z.number().int().positive("Price must be positive"),
  currency: currencyCodeSchema,
  seatIds: z.array(z.string()).optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;

// ─── Cart Item (action schema — only what the server action uses) ─────────────

export const cartItemActionSchema = z.object({
  eventId: uuidSchema,
  tierId: uuidSchema,
  quantity: z.number().int().min(1).max(CART_MAX_QUANTITY_PER_TIER),
});

export type CartItemAction = z.infer<typeof cartItemActionSchema>;

// ─── Full Checkout Schema (UI — includes price + payment intent) ──────────────

export const checkoutSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  attendee: attendeeSchema,
  items: z
    .array(cartItemSchema)
    .min(1, "Your cart is empty")
    .max(CART_MAX_TIERS, "Too many items in cart"),
  payment: paymentSchema,
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms and conditions" }),
  }),
  promoCode: z
    .string()
    .max(20, "Promo code cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;

// ─── Checkout Action Schema ───────────────────────────────────────────────────
// Minimal schema for what the server action validates before calling the backend.
// Stripe Checkout is redirect-based — the frontend never
// handles card data or generates a payment intent. The backend creates the
// payment session and returns a checkoutUrl to redirect to.

export const checkoutActionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  attendee: attendeeSchema,
  items: z
    .array(cartItemActionSchema)
    .min(1, "Your cart is empty")
    .max(CART_MAX_TIERS, "Too many items in cart"),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms and conditions" }),
  }),
  promoCode: z
    .string()
    .max(20)
    .optional()
    .or(z.literal("")),
});

export type CheckoutActionInput = z.infer<typeof checkoutActionSchema>;
