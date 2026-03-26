"use server";

import { checkoutActionSchema, CheckoutActionInput } from "@/lib/schemas/checkout";
import { ZodError } from "zod";

// ─── State Shape ──────────────────────────────────────────────────────────────

export type CheckoutActionState = {
  status: "idle" | "success" | "error" | "validation_error";
  message: string;
  fieldErrors?: Partial<Record<keyof CheckoutActionInput, string[]>>;
  orderId?: string;
};

const INITIAL_STATE: CheckoutActionState = {
  status: "idle",
  message: "",
};

export { INITIAL_STATE as checkoutInitialState };

// ─── Server Action ────────────────────────────────────────────────────────────

export async function submitCheckoutAction(
  _prevState: CheckoutActionState,
  formData: FormData
): Promise<CheckoutActionState> {
  // 1. Parse raw FormData into a plain object
  const raw = {
    sessionId: formData.get("sessionId"),
    paymentIntentId: formData.get("paymentIntentId"),
    agreedToTerms: formData.get("agreedToTerms") === "true",
    promoCode: formData.get("promoCode") ?? "",
    attendee: {
      firstName: formData.get("attendee.firstName"),
      lastName: formData.get("attendee.lastName"),
      email: formData.get("attendee.email"),
      phone: formData.get("attendee.phone") ?? "",
    },
    items: JSON.parse((formData.get("items") as string) ?? "[]"),
  };

  // 2. Validate with Zod
  try {
    const validated = checkoutActionSchema.parse(raw);

    // 3. Process the order (replace with real payment + DB logic)
    const orderId = await processOrder(validated);

    return {
      status: "success",
      message: "Your tickets have been confirmed!",
      orderId,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: CheckoutActionState["fieldErrors"] = {};

      for (const issue of error.issues) {
        const field = issue.path[0] as keyof CheckoutActionInput;
        if (!fieldErrors[field]) fieldErrors[field] = [];
        fieldErrors[field]!.push(issue.message);
      }

      return {
        status: "validation_error",
        message: "Please check the form for errors.",
        fieldErrors,
      };
    }

    // error intentionally swallowed — user sees generic message
    return {
      status: "error",
      message: "Something went wrong. Please try again.",
    };
  }
}

// ─── Stub: Replace with real DB + payment integration ────────────────────────

async function processOrder(data: CheckoutActionInput): Promise<string> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 800));

  // TODO: verify inventory, capture payment intent, write order to DB
  void data;
  return `order-${crypto.randomUUID()}`;
}
