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

### Nota Fase 0 (auth movil PKCE)

- El callback movil ya no acepta `access_token`/`refresh_token` por URL.
- El handoff movil requiere PKCE (`code_challenge` + `code_verifier`) de forma obligatoria.
- Si el replay-store (Redis/fallback permitido) no esta disponible, `POST /api/mobile-auth/create-code` responde `503` para evitar intercambios inconsistentes.

### Nota Fase 1 (nonce opaco)

- `auth_code` ahora es un nonce opaco (no contiene tokens ni payload legible).
- El payload sensible del handoff se guarda server-side y se consume una sola vez (`GETDEL` en Redis o fallback en memoria fuera de prod).

## Rutas

- `/auth` (login/register por query `mode`)
- `/login` -> alias a `/auth?mode=login`
- `/register` -> alias a `/auth?mode=register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
