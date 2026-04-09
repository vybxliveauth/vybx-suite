/**
 * Mobile analytics adapter.
 *
 * Re-exports event name constants from @vybx/analytics and provides
 * a React Native-compatible tracker (no navigator.sendBeacon, no window).
 */

export { AnalyticsEvents } from "@vybx/analytics";
export type { AnalyticsEventName } from "@vybx/analytics";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

const ENDPOINT = `${BASE_URL}/analytics/events`;
const BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5_000;

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
};

function createMobileAnalyticsClient(
  globalProperties: Record<string, unknown> = {},
) {
  let buffer: AnalyticsEvent[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flush();
    }, FLUSH_INTERVAL_MS);
  }

  async function flush() {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    // fire-and-forget — analytics must never break the app
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Client": "mobile" },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // silently drop
    }
  }

  function track(name: string, properties?: Record<string, unknown>) {
    buffer.push({
      name,
      properties: { ...globalProperties, ...properties },
      timestamp: Date.now(),
    });
    if (buffer.length >= BATCH_SIZE) {
      void flush();
    } else {
      scheduleFlush();
    }
  }

  function setGlobalProperties(props: Record<string, unknown>) {
    Object.assign(globalProperties, props);
  }

  return { track, flush, setGlobalProperties };
}

export const tracker = createMobileAnalyticsClient({
  surface: "mobile",
});
