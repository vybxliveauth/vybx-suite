#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ACCOUNT_BASE_URL="${ACCOUNT_BASE_URL:-https://account.vybxlive.com}"
API_BASE_URL="${API_BASE_URL:-https://api.vybxlive.com}"
PAGE_SIZE="${PAGE_SIZE:-20}"
CALLBACK_URL="${CALLBACK_URL:-exp://u.expo.dev/update/00000000-0000-0000-0000-000000000000/--/auth/callback}"
CODE_CHALLENGE="${CODE_CHALLENGE:-ifE1UbCpVrZVHoDjwueuhbxj57ZJBYB5rPcLFZBU3HI}"
CODE_CHALLENGE_METHOD="${CODE_CHALLENGE_METHOD:-S256}"
STATE="${STATE:-probe-state-12345678}"

# Optional strict auth success probe.
# If both vars are present, the script runs an authenticated mobile login probe.
MOBILE_PROBE_EMAIL="${MOBILE_PROBE_EMAIL:-}"
MOBILE_PROBE_PASSWORD="${MOBILE_PROBE_PASSWORD:-}"

echo "[INFO] Mobile hardening root: $ROOT_DIR"
echo "[INFO] Account base URL: $ACCOUNT_BASE_URL"
echo "[INFO] API base URL: $API_BASE_URL"

echo "[STEP] Mobile typecheck"
pnpm -C "$ROOT_DIR" --filter @vybx/mobile typecheck

echo "[STEP] Mobile auth regression probe (headers/body/DTO)"
ACCOUNT_BASE_URL="$ACCOUNT_BASE_URL" \
CALLBACK_URL="$CALLBACK_URL" \
STATE="$STATE" \
CODE_CHALLENGE="$CODE_CHALLENGE" \
CODE_CHALLENGE_METHOD="$CODE_CHALLENGE_METHOD" \
pnpm -C "$ROOT_DIR" probe:mobile-auth

if [[ -n "$MOBILE_PROBE_EMAIL" && -n "$MOBILE_PROBE_PASSWORD" ]]; then
  echo "[STEP] Mobile auth success probe (real credentials)"
  ACCOUNT_BASE_URL="$ACCOUNT_BASE_URL" \
  CALLBACK_URL="$CALLBACK_URL" \
  STATE="$STATE" \
  CODE_CHALLENGE="$CODE_CHALLENGE" \
  CODE_CHALLENGE_METHOD="$CODE_CHALLENGE_METHOD" \
  LOGIN_EMAIL="$MOBILE_PROBE_EMAIL" \
  LOGIN_PASSWORD="$MOBILE_PROBE_PASSWORD" \
  EXPECT_SUCCESS_LOGIN=1 \
  pnpm -C "$ROOT_DIR" probe:mobile-auth
else
  echo "[WARN] MOBILE_PROBE_EMAIL/MOBILE_PROBE_PASSWORD not set. Skipping success-login probe."
fi

echo "[STEP] Mobile events contract + pagination probe"
API_BASE_URL="$API_BASE_URL" \
PAGE_SIZE="$PAGE_SIZE" \
pnpm -C "$ROOT_DIR" probe:mobile-events

echo "[STEP] Production domain/API baseline probe"
API_BASE_URL="$API_BASE_URL" \
pnpm -C "$ROOT_DIR" probe:prod

echo ""
echo "[OK] Mobile release hardening completed."
