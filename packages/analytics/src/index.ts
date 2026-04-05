// ─── VybeTickets Client Analytics ────────────────────────────────────────────
//
// Lightweight, fire-and-forget event tracking for the frontend apps.
// Uses navigator.sendBeacon on page unload to avoid losing events.
// Falls back to fetch when sendBeacon is unavailable.
//
// Usage:
//   const tracker = createAnalyticsClient({ endpoint: "/api/v1/analytics/events" });
//   tracker.track("checkout_started", { eventId: "abc", tierCount: 2 });
//   tracker.track("ticket_purchased", { eventId: "abc", amount: 5000, currency: "DOP" });

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
};

type AnalyticsClientOptions = {
  /** Full URL or path to the analytics ingestion endpoint */
  endpoint: string;
  /** Flush buffer when it reaches this size (default: 10) */
  batchSize?: number;
  /** Flush buffer after this many ms of inactivity (default: 5000) */
  flushIntervalMs?: number;
  /** Attach to every event (e.g. userId, sessionId, surface) */
  globalProperties?: Record<string, unknown>;
  /** Enable debug logging to console (default: false) */
  debug?: boolean;
};

// ─── Predefined Event Names ──────────────────────────────────────────────────
// Use these constants for consistency across apps.

export const AnalyticsEvents = {
  // Auth funnel
  AUTH_MODAL_OPENED: "auth_modal_opened",
  AUTH_EMAIL_SUBMITTED: "auth_email_submitted",
  AUTH_LOGIN_SUCCESS: "auth_login_success",
  AUTH_REGISTER_SUCCESS: "auth_register_success",
  AUTH_LOGIN_FAILED: "auth_login_failed",

  // Browse funnel
  EVENT_VIEWED: "event_viewed",
  EVENT_SHARED: "event_shared",
  CATEGORY_FILTERED: "category_filtered",
  SEARCH_PERFORMED: "search_performed",

  // Purchase funnel
  TICKET_SELECTED: "ticket_selected",
  CART_ITEM_ADDED: "cart_item_added",
  CART_ITEM_REMOVED: "cart_item_removed",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_ABANDONED: "checkout_abandoned",
  PAYMENT_FAILED: "payment_failed",

  // Promoter
  PROMOTER_EVENT_CREATED: "promoter_event_created",
  PROMOTER_EVENT_PUBLISHED: "promoter_event_published",
  PROMOTER_REFUND_REVIEWED: "promoter_refund_reviewed",

  // Admin
  ADMIN_CONFIG_UPDATED: "admin_config_updated",
  ADMIN_USER_CREATED: "admin_user_created",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

// ─── Client ──────────────────────────────────────────────────────────────────

export function createAnalyticsClient(options: AnalyticsClientOptions) {
  const {
    endpoint,
    batchSize = 10,
    flushIntervalMs = 5_000,
    globalProperties = {},
    debug = false,
  } = options;

  let buffer: AnalyticsEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function log(...args: unknown[]) {
    if (debug) console.debug("[analytics]", ...args);
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, flushIntervalMs);
  }

  function flush() {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    send(batch);
  }

  function send(events: AnalyticsEvent[]) {
    const payload = JSON.stringify({ events });
    log("sending", events.length, "events");

    // Prefer sendBeacon for reliability during page unload
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
      // sendBeacon can fail if payload is too large — fall through to fetch
    }

    // Fallback to fetch (fire-and-forget)
    if (typeof fetch !== "undefined") {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        credentials: "include",
        keepalive: true,
      }).catch(() => {
        // Silently drop — analytics should never break the app
      });
    }
  }

  function track(name: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name,
      properties: { ...globalProperties, ...properties },
      timestamp: Date.now(),
    };
    buffer.push(event);
    log("tracked", name, event.properties);

    if (buffer.length >= batchSize) {
      flush();
    } else {
      scheduleFlush();
    }
  }

  // Flush on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    track,
    flush,
    /** Update global properties (e.g. after login sets userId) */
    setGlobalProperties(props: Record<string, unknown>) {
      Object.assign(globalProperties, props);
    },
  };
}
