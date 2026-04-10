# @vybx/account

Superficie dedicada de autenticacion para usuarios finales (`USER`).

## Variables de entorno

- `NEXT_PUBLIC_API_URL`: URL del backend API.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Site Key de Cloudflare Turnstile.
- `NEXT_PUBLIC_TURNSTILE_TEST_TOKEN`: solo para desarrollo local sin widget real.
- `NEXT_PUBLIC_WEB_APP_URL`: URL de regreso para enlaces al sitio publico.
- `MOBILE_AUTH_CODE_SECRET`: secreto HMAC para firmar `auth_code` movil.
- `UPSTASH_REDIS_REST_URL`: URL REST de Upstash Redis (replay protection global).
- `UPSTASH_REDIS_REST_TOKEN`: token REST de Upstash Redis.
- `MOBILE_AUTH_ALLOW_IN_MEMORY_REPLAY_FALLBACK`: fallback opcional (solo recomendado fuera de produccion).

## Rutas

- `/auth` (login/register por query `mode`)
- `/login` -> alias a `/auth?mode=login`
- `/register` -> alias a `/auth?mode=register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
