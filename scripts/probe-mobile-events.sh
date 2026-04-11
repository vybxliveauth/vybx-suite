#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://api.vybxlive.com}"
PAGE_SIZE="${PAGE_SIZE:-20}"

echo "[INFO] API base URL: $API_BASE_URL"
echo "[INFO] Page size: $PAGE_SIZE"

export API_BASE_URL PAGE_SIZE

node <<'EOF'
const apiBaseUrl = process.env.API_BASE_URL;
const pageSizeRaw = process.env.PAGE_SIZE ?? "20";
const pageSize = Number.parseInt(pageSizeRaw, 10);

const fail = (message) => {
  console.error(`[FAIL] ${message}`);
  process.exit(1);
};

if (!apiBaseUrl || !Number.isFinite(pageSize) || pageSize <= 0) {
  fail("Invalid API_BASE_URL or PAGE_SIZE.");
}

function sanitizeBaseUrl(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

const base = sanitizeBaseUrl(apiBaseUrl);
const strictValidationErrorRegex = /property _ should not exist/i;

async function fetchJson(path) {
  const response = await fetch(`${base}${path}`, {
    method: "GET",
    headers: {
      "X-Client": "mobile",
      Accept: "application/json",
    },
  });

  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveEventsPayload(json) {
  if (!isRecord(json)) return null;
  if (Array.isArray(json.data)) return { events: json.data, source: "data" };
  if (Array.isArray(json.items)) return { events: json.items, source: "items" };
  return null;
}

function resolvePagination(json) {
  if (!isRecord(json)) {
    return { page: null, pageSize: null, total: null };
  }
  const nested = isRecord(json.pagination) ? json.pagination : null;
  return {
    page:
      typeof json.page === "number"
        ? json.page
        : typeof nested?.page === "number"
          ? nested.page
          : null,
    pageSize:
      typeof json.pageSize === "number"
        ? json.pageSize
        : typeof nested?.limit === "number"
          ? nested.limit
          : null,
    total:
      typeof json.total === "number"
        ? json.total
        : typeof nested?.total === "number"
          ? nested.total
          : null,
  };
}

function validateEventShape(event, index) {
  if (!isRecord(event)) {
    fail(`events[${index}] is not an object.`);
  }
  if (typeof event.id !== "string" || event.id.length === 0) {
    fail(`events[${index}].id is missing or invalid.`);
  }
  if (typeof event.title !== "string" || event.title.length === 0) {
    fail(`events[${index}].title is missing or invalid.`);
  }
  if (typeof event.date !== "string" || event.date.length === 0) {
    fail(`events[${index}].date is missing or invalid.`);
  }
  if (typeof event.status !== "string" || event.status.length === 0) {
    fail(`events[${index}].status is missing or invalid.`);
  }
}

async function run() {
  const eventsList = await fetchJson(`/api/v1/events?page=1&limit=${pageSize}`);
  if (eventsList.response.status !== 200) {
    fail(
      `GET /api/v1/events failed with ${eventsList.response.status}. Body: ${eventsList.text.slice(0, 220)}`,
    );
  }
  if (strictValidationErrorRegex.test(eventsList.text)) {
    fail(
      "DTO strict-validation error detected again on events endpoint (property _ should not exist).",
    );
  }

  const resolved = resolveEventsPayload(eventsList.json);
  if (!resolved) {
    fail("Events payload is missing data/items array.");
  }

  const { events, source } = resolved;
  const pagination = resolvePagination(eventsList.json);
  console.log(`[OK] /events returned ${events.length} records from '${source}'.`);

  if (pagination.page !== null && pagination.page !== 1) {
    fail(`Expected page=1, got ${pagination.page}.`);
  }
  if (pagination.pageSize !== null && pagination.pageSize !== pageSize) {
    fail(`Expected pageSize/limit=${pageSize}, got ${pagination.pageSize}.`);
  }
  if (pagination.total !== null && pagination.total < events.length) {
    fail(`Invalid total (${pagination.total}) < events.length (${events.length}).`);
  }

  for (let i = 0; i < Math.min(events.length, 5); i += 1) {
    validateEventShape(events[i], i);
  }

  if (events.length === 0) {
    console.warn("[WARN] /events returned 0 records. Contract is valid, but catalog is empty.");
  }

  const firstEventId =
    events.length > 0 && isRecord(events[0]) && typeof events[0].id === "string"
      ? events[0].id
      : null;

  if (firstEventId) {
    const eventDetail = await fetchJson(`/api/v1/events/${encodeURIComponent(firstEventId)}`);
    if (eventDetail.response.status !== 200) {
      fail(
        `GET /api/v1/events/:id failed with ${eventDetail.response.status} for ${firstEventId}.`,
      );
    }
    if (!isRecord(eventDetail.json) || eventDetail.json.id !== firstEventId) {
      fail("Event detail payload does not match requested event id.");
    }
    console.log(`[OK] /events/${firstEventId} detail loads correctly.`);
  } else {
    console.warn("[WARN] Skipping /events/:id check because list is empty.");
  }

  const eventsPage2 = await fetchJson(`/api/v1/events?page=2&limit=${pageSize}`);
  if (eventsPage2.response.status !== 200) {
    fail(`GET /api/v1/events?page=2 failed with ${eventsPage2.response.status}.`);
  }
  const resolvedPage2 = resolveEventsPayload(eventsPage2.json);
  if (!resolvedPage2) {
    fail("Events page 2 payload is missing data/items array.");
  }
  console.log(`[OK] /events page 2 returned ${resolvedPage2.events.length} records.`);

  const categories = await fetchJson("/api/v1/categories/active");
  if (categories.response.status !== 200) {
    fail(
      `GET /api/v1/categories/active failed with ${categories.response.status}. Body: ${categories.text.slice(0, 220)}`,
    );
  }
  if (!Array.isArray(categories.json)) {
    fail("/categories/active payload is not an array.");
  }
  for (let i = 0; i < Math.min(categories.json.length, 10); i += 1) {
    const category = categories.json[i];
    if (!isRecord(category)) {
      fail(`categories[${i}] is not an object.`);
    }
    if (typeof category.id !== "string" || category.id.length === 0) {
      fail(`categories[${i}].id is missing or invalid.`);
    }
    if (typeof category.name !== "string" || category.name.length === 0) {
      fail(`categories[${i}].name is missing or invalid.`);
    }
  }
  console.log(`[OK] /categories/active returned ${categories.json.length} categories.`);

  console.log("[OK] Mobile events probe passed.");
}

run().catch((error) => {
  console.error("[FAIL] Mobile events probe crashed.");
  console.error(error);
  process.exit(1);
});
EOF
