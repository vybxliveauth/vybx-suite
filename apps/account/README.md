# @vybx/account

Superficie dedicada de autenticacion para usuarios finales (`USER`).

## Variables de entorno

- `NEXT_PUBLIC_API_URL`: URL del backend API.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Site Key de Cloudflare Turnstile.
- `NEXT_PUBLIC_TURNSTILE_TEST_TOKEN`: solo para desarrollo local sin widget real.
- `NEXT_PUBLIC_WEB_APP_URL`: URL de regreso para enlaces al sitio publico.

## Rutas

- `/auth` (login/register por query `mode`)
- `/login` -> alias a `/auth?mode=login`
- `/register` -> alias a `/auth?mode=register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
