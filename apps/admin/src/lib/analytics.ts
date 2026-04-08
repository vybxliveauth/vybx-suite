"use client";

import { createAnalyticsClient, AnalyticsEvents } from "@vybx/analytics";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004/api/v1";

export const tracker = createAnalyticsClient({
  endpoint: `${API_BASE_URL}/analytics/events`,
  batchSize: 10,
  flushIntervalMs: 5000,
  debug: process.env.NODE_ENV === "development",
});

export { AnalyticsEvents };
