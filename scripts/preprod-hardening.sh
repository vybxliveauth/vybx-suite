#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-/home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-$BACKEND_DIR/.env}"
API_BASE_URL="${API_BASE_URL:-https://api.vybxlive.com}"

if [[ ! -d "$ROOT_DIR" ]]; then
  echo "[FAIL] Root directory not found: $ROOT_DIR"
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "[FAIL] Backend directory not found: $BACKEND_DIR"
  exit 1
fi

if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
  echo "[FAIL] Backend env file not found: $BACKEND_ENV_FILE"
  exit 1
fi

echo "[INFO] Root directory: $ROOT_DIR"
echo "[INFO] Backend directory: $BACKEND_DIR"
echo "[INFO] Backend env file: $BACKEND_ENV_FILE"
echo "[INFO] API base URL: $API_BASE_URL"
echo ""

echo "[STEP] Frontend suite typecheck"
pnpm -C "$ROOT_DIR" typecheck

echo "[STEP] Frontend suite build"
pnpm -C "$ROOT_DIR" build

echo "[STEP] Backend build"
npm -C "$BACKEND_DIR" run build

echo "[STEP] Backend tests"
npm -C "$BACKEND_DIR" test -- --runInBand

echo "[STEP] Backend production preflight"
bash "$BACKEND_DIR/scripts/preflight-prod.sh" "$BACKEND_ENV_FILE"

echo "[STEP] Backend production smoke"
bash "$BACKEND_DIR/scripts/smoke-prod.sh" "$BACKEND_ENV_FILE" "$API_BASE_URL"

echo "[STEP] Production domain/API probe"
bash "$ROOT_DIR/scripts/probe-production.sh"

echo ""
echo "[OK] Preproduction hardening pack completed."
