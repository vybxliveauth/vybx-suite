"use server";

import { checkoutActionSchema, CheckoutActionInput } from "@/lib/schemas/checkout";
import { cookies } from "next/headers";
import { ZodError } from "zod";

// ─── State Shape ──────────────────────────────────────────────────────────────

export type CheckoutActionState = {
  status: "idle" | "success" | "error" | "validation_error";
  message: string;
  fieldErrors?: Partial<Record<keyof CheckoutActionInput, string[]>>;
  orderId?: string;
  checkoutUrl?: string;
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
  try {
    // 0. Validate cart expiry server-side before any backend call
    const cartExpiresAt = formData.get("cartExpiresAt");
    if (cartExpiresAt !== null) {
      const expiryMs = Number(cartExpiresAt);
      if (!isNaN(expiryMs) && expiryMs > 0 && expiryMs < Date.now()) {
        return {
          status: "error",
          message:
            "Tu reserva ha expirado. Vuelve a agregar los tickets e intenta nuevamente.",
        };
      }
    }

    const itemsRaw = formData.get("items");
    const parsedItems =
      typeof itemsRaw === "string" && itemsRaw.trim().length > 0
        ? (JSON.parse(itemsRaw) as unknown[])
        : [];

    // 1. Parse raw FormData into a plain object
    const raw = {
      sessionId: formData.get("sessionId"),
      agreedToTerms: formData.get("agreedToTerms") === "true",
      promoCode: formData.get("promoCode") ?? "",
      attendee: {
        firstName: formData.get("attendee.firstName"),
        lastName: formData.get("attendee.lastName"),
        email: formData.get("attendee.email"),
        phone: formData.get("attendee.phone") ?? "",
      },
      items: parsedItems,
    };

    // 2. Validate with Zod
    const validated = checkoutActionSchema.parse(raw);
    const turnstileToken = String(formData.get("turnstileToken") ?? "").trim();
    const queueToken = String(formData.get("queueToken") ?? "").trim();

    // 3. Process through backend checkout endpoint (persists reservations in DB)
    const checkout = await processOrder(validated, {
      turnstileToken: turnstileToken.length > 0 ? turnstileToken : undefined,
      queueToken: queueToken.length > 0 ? queueToken : undefined,
    });

    return {
      status: "success",
      message: "Checkout iniciado correctamente.",
      orderId: checkout.reference,
      checkoutUrl: checkout.checkoutUrl,
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
        message: "Revisa los datos del formulario.",
        fieldErrors,
      };
    }
    return {
      status: "error",
      message: extractErrorMessage(error),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ProcessOrderOptions = {
  turnstileToken?: string;
  queueToken?: string;
};

type CheckoutIntentResponse = {
  reference: string;
  checkoutUrl: string;
};

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Algo salió mal. Por favor intenta nuevamente.";
}

async function processOrder(
  data: CheckoutActionInput,
  options: ProcessOrderOptions
): Promise<CheckoutIntentResponse> {
  const uniqueEventIds = [...new Set(data.items.map((item) => item.eventId))];
  if (uniqueEventIds.length !== 1) {
    throw new Error("El checkout solo soporta un evento por transacción.");
  }

  const cookieStore = await cookies();
  const csrfToken = cookieStore.get("csrf_token")?.value ?? "";
  const authCookieNames = new Set(["access_token", "refresh_token", "csrf_token"]);
  const backendCookieHeader = cookieStore
    .getAll()
    .filter((c) => authCookieNames.has(c.name))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const baseUrl =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";
  const idempotencyKey = crypto.randomUUID();

  const response = await fetch(`${baseUrl}/payments/create-cart-intent`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
      "idempotency-key": idempotencyKey,
      ...(options.queueToken ? { "x-queue-token": options.queueToken } : {}),
      ...(backendCookieHeader ? { cookie: backendCookieHeader } : {}),
    },
    body: JSON.stringify({
      eventId: uniqueEventIds[0],
      items: data.items.map((item) => ({
        ticketTypeId: item.tierId,
        quantity: item.quantity,
      })),
      ...(options.turnstileToken ? { turnstileToken: options.turnstileToken } : {}),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const rawMessage =
      payload && typeof payload === "object"
        ? (payload as { message?: unknown }).message
        : "";
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(", ")
      : typeof rawMessage === "string" && rawMessage.trim().length > 0
        ? rawMessage
        : "No se pudo iniciar el checkout.";
    throw new Error(message);
  }

  const intent = payload as Partial<CheckoutIntentResponse>;
  if (!intent.reference || !intent.checkoutUrl) {
    throw new Error("Respuesta del servidor incompleta al iniciar el checkout.");
  }

  return {
    reference: intent.reference,
    checkoutUrl: intent.checkoutUrl,
  };
}
