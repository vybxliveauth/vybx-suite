#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-https://api.vybxlive.com}"
WEB_BASE_URL="${WEB_BASE_URL:-https://www.vybxlive.com}"
PROMOTER_BASE_URL="${PROMOTER_BASE_URL:-https://promoter.vybxlive.com}"
ADMIN_BASE_URL="${ADMIN_BASE_URL:-https://admin.vybxlive.com}"

errors=()

check_status() {
  local label="$1"
  local url="$2"
  local accepted_csv="$3"
  local code
  code="$(curl -sS -o /tmp/vybx_probe_body.json -w '%{http_code}' "$url" || true)"

  IFS=',' read -r -a accepted <<<"$accepted_csv"
  local ok=false
  for candidate in "${accepted[@]}"; do
    if [[ "$code" == "$candidate" ]]; then
      ok=true
      break
    fi
  done

  if [[ "$ok" == "true" ]]; then
    echo "[OK] $label ($code)"
  else
    errors+=("$label returned HTTP $code (expected one of: $accepted_csv)")
  fi
}

check_options_origin() {
  local label="$1"
  local origin="$2"
  local response_file
  response_file="$(mktemp)"

  curl -sSI -X OPTIONS "$API_BASE_URL/auth/login" \
    -H "Origin: $origin" \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type,x-csrf-token' >"$response_file"

  local status
  local allow_origin
  status="$(head -n1 "$response_file" | sed -E 's/.* ([0-9]{3}).*/\1/')"
  allow_origin="$(tr -d '\r' <"$response_file" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2; exit}')"
  rm -f "$response_file"

  if [[ "$status" != "204" ]]; then
    errors+=("$label CORS preflight failed (status=$status)")
    return
  fi
  if [[ "$allow_origin" != "$origin" ]]; then
    errors+=("$label CORS allow-origin mismatch (got=${allow_origin:-NONE}, expected=$origin)")
    return
  fi
  echo "[OK] $label CORS preflight"
}

echo "[INFO] Probe target API: $API_BASE_URL"
echo "[INFO] Probe target web: $WEB_BASE_URL"
echo "[INFO] Probe target promoter: $PROMOTER_BASE_URL"
echo "[INFO] Probe target admin: $ADMIN_BASE_URL"

check_status "API health" "$API_BASE_URL/health" "200"
check_status "API public events" "$API_BASE_URL/api/v1/events?limit=1" "200"
check_status "Web landing" "$WEB_BASE_URL" "200,301,302,307,308"
check_status "Promoter landing" "$PROMOTER_BASE_URL" "200,301,302,307,308"
check_status "Admin landing" "$ADMIN_BASE_URL" "200,301,302,307,308"

check_options_origin "Admin origin" "$ADMIN_BASE_URL"
check_options_origin "Promoter origin" "$PROMOTER_BASE_URL"
check_options_origin "Web origin" "$WEB_BASE_URL"

if (( ${#errors[@]} > 0 )); then
  echo ""
  echo "[FAIL] Production probe found ${#errors[@]} issue(s):"
  for err in "${errors[@]}"; do
    echo "- $err"
  done
  exit 1
fi

echo ""
echo "[OK] Production probe passed."
