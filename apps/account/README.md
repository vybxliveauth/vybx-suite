# @vybx/account

Superficie dedicada de autenticacion para usuarios finales (`USER`).

## Variables de entorno

- `NEXT_PUBLIC_API_URL`: URL del backend API.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Site Key de Cloudflare Turnstile.
- `NEXT_PUBLIC_TURNSTILE_TEST_TOKEN`: solo para desarrollo local sin widget real.
- `NEXT_PUBLIC_WEB_APP_URL`: URL de regreso para enlaces al sitio publico.
- `UPSTASH_REDIS_REST_URL`: URL REST de Upstash Redis (replay protection global).
- `UPSTASH_REDIS_REST_TOKEN`: token REST de Upstash Redis.
- `MOBILE_AUTH_ALLOW_IN_MEMORY_REPLAY_FALLBACK`: fallback opcional (solo recomendado fuera de produccion).
- `MOBILE_AUTH_REQUIRE_DISTRIBUTED_STORE`: obliga uso de Redis distribuido (si no esta disponible, bloquea endpoints sensibles con `503`).
- `MOBILE_AUTH_CREATE_RATE_LIMIT_MAX`: limite de `create-code` por ventana.
- `MOBILE_AUTH_CREATE_RATE_LIMIT_WINDOW_SECONDS`: ventana en segundos para `create-code`.
- `MOBILE_AUTH_EXCHANGE_RATE_LIMIT_MAX`: limite de `exchange-code` por ventana.
- `MOBILE_AUTH_EXCHANGE_RATE_LIMIT_WINDOW_SECONDS`: ventana en segundos para `exchange-code`.

### Nota Fase 0 (auth movil PKCE)

- El callback movil ya no acepta `access_token`/`refresh_token` por URL.
- El handoff movil requiere PKCE (`code_challenge` + `code_verifier`) de forma obligatoria.
- Si el replay-store (Redis/fallback permitido) no esta disponible, `POST /api/mobile-auth/create-code` responde `503` para evitar intercambios inconsistentes.

### Nota Fase 1 (nonce opaco)

- `auth_code` ahora es un nonce opaco (no contiene tokens ni payload legible).
- El payload sensible del handoff se guarda server-side y se consume una sola vez (`GETDEL` en Redis o fallback en memoria fuera de prod).

### Nota Fase 2 (hardening operativo)

- `POST /api/mobile-auth/create-code` y `POST /api/mobile-auth/exchange-code` ahora tienen rate limit (Redis o fallback en memoria fuera de prod).
- Ambos endpoints devuelven headers `X-RateLimit-*` y `Retry-After` cuando aplica.
- Validaciones reforzadas: `state` y `code_verifier` con formato estricto, y comparaciones en tiempo constante para `state`/PKCE challenge.

### Nota Fase 3 (modo estricto distribuido)

- Se agrego `MOBILE_AUTH_REQUIRE_DISTRIBUTED_STORE` para ejecutar el flujo mobile-auth en modo estricto distribuido.
- Si este modo esta activo y Redis no esta disponible, los endpoints sensibles responden `503` (fail-safe).
- En produccion, si se usa fallback en memoria, se expone `X-Mobile-Auth-Security-Mode: degraded-memory-fallback` para detectar configuraciones degradadas.

## Rutas

- `/auth` (login/register por query `mode`)
- `/login` -> alias a `/auth?mode=login`
- `/register` -> alias a `/auth?mode=register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
