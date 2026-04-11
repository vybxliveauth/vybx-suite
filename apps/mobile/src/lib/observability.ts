import { tracker } from "./analytics";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MAX_ERROR_MESSAGE_LENGTH = 220;

function sanitizeErrorMessage(input: string): string {
  return input
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function extractHttpStatus(error: unknown): number | null {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const statusMatch = message.match(/\b([45]\d{2})\b/);
  return statusMatch ? Number(statusMatch[1]) : null;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return sanitizeErrorMessage(error.message.trim());
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return sanitizeErrorMessage(error.trim());
  }
  return "unknown_error";
}

type TelemetryContext = Record<string, unknown>;

export function reportMobileError(
  eventName: string,
  context: TelemetryContext,
  error: unknown,
) {
  const status = extractHttpStatus(error);
  const errorMessage = extractErrorMessage(error);
  const payload: Record<string, unknown> = {
    ...context,
    status,
    error_message: errorMessage,
  };

  tracker.track(eventName, payload);

  if (__DEV__) {
    console.warn(`[mobile-observability] ${eventName}`, payload);
  }
}

export function reportMobileInfo(
  eventName: string,
  context: TelemetryContext = {},
) {
  tracker.track(eventName, context);
}
