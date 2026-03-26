# Beta -> Produccion (Mismo Dominio)

Checklist para publicar `vybx-suite` sobre el mismo dominio de alfa, sin cambiar URLs publicas.

Runbook principal actualizado:

- `PREPROD_HARDENING_PACK.md`

## 1) Estado tecnico actual

Ejecutado en local:

- `pnpm -C /home/mr-x/Desktop/vybx-suite lint` -> OK (sin errores ni warnings).
- `pnpm -C /home/mr-x/Desktop/vybx-suite typecheck` -> OK.
- `pnpm -C /home/mr-x/Desktop/vybx-suite build` -> OK.
- `npm -C /home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend run build` -> OK.
- `npm -C /home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend run preflight:prod` -> FAIL con 3 bloqueos de entorno:
  - `REDIS_PASSWORD` (< 12 chars).
  - `FRONTEND_URL` no usa `https://`.
  - `RD_PAYMENT_CHECKOUT_URL` no usa `https://`.

## 2) Bloqueos a cerrar antes del deploy

En `.env` de produccion del backend:

1. `NODE_ENV=production`
2. `REDIS_PASSWORD` seguro (>= 12 chars)
3. `FRONTEND_URL=https://www.vybxlive.com` (o dominio final publico)
4. `RD_PAYMENT_CHECKOUT_URL=https://...` (nunca `/payment/mock-gateway` en prod)
5. `RD_PAYMENT_WEBHOOK_SECRET` y `RD_PAYMENT_REQUEST_SIGNING_SECRET` (>= 16 chars)
6. `QUEUE_ENFORCE_SIGNED_TOKEN=true`
7. `QUEUE_JOIN_TURNSTILE_REQUIRED=true`
8. `QUEUE_TOKEN_SECRET` (>= 24 chars)
9. `ALLOWED_ORIGINS`, `PROMOTER_ALLOWED_ORIGINS`, `ADMIN_ALLOWED_ORIGINS` con dominios HTTPS reales

## 3) Variables de frontend por app

- `apps/web/.env.production`:
  - `NEXT_PUBLIC_API_URL=https://api.vybxlive.com`
  - `NEXT_PUBLIC_SITE_URL=https://www.vybxlive.com`
- `apps/promoter/.env.production`:
  - `NEXT_PUBLIC_API_URL=https://api.vybxlive.com`
- `apps/admin/.env.production`:
  - `NEXT_PUBLIC_API_URL=https://api.vybxlive.com`

## 4) Orden recomendado de salida (mismo dominio)

1. Backup DB de produccion.
2. Deploy backend + migraciones (`prisma migrate deploy`).
3. Validar health endpoint backend.
4. Deploy frontend beta (web/promoter/admin) sobre el mismo dominio/subdominios actuales.
5. Smoke manual inmediato:
   - login/logout/refresh (`web`, `promoter`, `admin`)
   - compra minima end-to-end
   - crear/editar evento en admin y visibilidad en web
6. Si algo falla: rollback a build previo (dominio se mantiene igual).

## 5) Comandos de verificacion antes de cortar

```bash
# Frontend suite
pnpm -C /home/mr-x/Desktop/vybx-suite lint
pnpm -C /home/mr-x/Desktop/vybx-suite typecheck
pnpm -C /home/mr-x/Desktop/vybx-suite build
pnpm -C /home/mr-x/Desktop/vybx-suite hardening:preprod

# Backend
npm -C "/home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend" run build
npm -C "/home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend" run preflight:prod
```
