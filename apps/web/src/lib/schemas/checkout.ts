import { z } from "zod";

// ─── Attendee Info ────────────────────────────────────────────────────────────

export const attendeeSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name cannot exceed 50 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "First name contains invalid characters"),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Last name contains invalid characters"),

  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  phone: z
    .string()
    .regex(
      /^\+?[1-9]\d{7,14}$/,
      "Please enter a valid phone number (e.g. +1234567890)"
    )
    .optional()
    .or(z.literal("")),
});

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  // Card fields — in real flow these come tokenized from Stripe/etc.
  // Here we validate the token/intent ID returned by the payment provider.
  paymentIntentId: z
    .string()
    .min(1, "Payment information is required")
    .startsWith("pi_", "Invalid payment intent"),

  savePaymentMethod: z.boolean().default(false),
});

// ─── Cart Item Validation ─────────────────────────────────────────────────────

export const cartItemSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  tierId: z.string().uuid("Invalid tier ID"),
  quantity: z
    .number()
    .int()
    .min(1, "Quantity must be at least 1")
    .max(10, "Maximum 10 tickets per order"),
  unitPrice: z.number().int().positive("Price must be positive"),
  currency: z.string().length(3, "Currency must be a 3-letter ISO code"),
  seatIds: z.array(z.string()).optional(),
});

// ─── Full Checkout Schema ─────────────────────────────────────────────────────

export const checkoutSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),

  attendee: attendeeSchema,

  items: z
    .array(cartItemSchema)
    .min(1, "Your cart is empty")
    .max(10, "Too many items in cart"),

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

// ─── Server Action Input ──────────────────────────────────────────────────────
// Stripped version used as Server Action input (payment intent comes from client)

export const checkoutActionSchema = checkoutSchema.omit({ payment: true }).extend({
  paymentIntentId: z
    .string()
    .min(1, "Payment information is required")
    .startsWith("pi_"),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type AttendeeFormData = z.infer<typeof attendeeSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type CheckoutActionInput = z.infer<typeof checkoutActionSchema>;
