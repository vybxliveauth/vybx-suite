# Preproduction Hardening Pack (Beta)

Este runbook concentra lo minimo para pasar de beta a produccion estable, manteniendo alfa guardada localmente.

## 1) Rotacion de secretos (bloqueante)

Backend:

```bash
cd "/home/mr-x/Desktop/Proyecto V2/VybeTickets-Backend"
npm run secrets:generate
```

Secretos que debes rotar en proveedores/plataformas:

1. `DATABASE_URL` (usuario/password o token DB)
2. `TURNSTILE_SECRET_KEY`
3. `RESEND_API_KEY`
4. `TWILIO_AUTH_TOKEN` (si aplica)
5. Credenciales de pagos (`RD_*`, `AZUL_*`)

Despues de rotar, actualiza `.env` de produccion y ejecuta:

```bash
npm run preflight:prod -- .env
```

## 2) Integridad tecnica automatizada

Desde `vybx-suite`:

```bash
cd /home/mr-x/Desktop/vybx-suite
pnpm hardening:preprod
```

Este comando ejecuta en orden:

1. `typecheck` + `build` de suite (`web/promoter/admin`)
2. build + tests del backend
3. preflight de variables de backend
4. smoke de backend (`health`, `CORS`, login opcional)
5. probe de dominios (`web/promoter/admin/api`)

## 3) Monitoreo minimo antes de abrir

Checks de disponibilidad:

```bash
cd /home/mr-x/Desktop/vybx-suite
pnpm probe:prod
```

Recomendado en ventana de lanzamiento:

1. Ejecutar cada 5 min por 1 hora post-deploy.
2. Revisar errores 4xx/5xx en backend y Vercel.
3. Confirmar que `admin` y `promoter` mantienen login/refresh.

## 4) Plan de rollback (listo para usar)

### Backend (droplet)

1. Restaurar backup `.env` previo (`.env.backup.YYYYMMDD_HHMMSS`).
2. Relevantar servicio:

```bash
cd /var/www/vybxlive-deploy
docker compose up -d backend
```

3. Validar:

```bash
curl -sS -i https://api.vybxlive.com/health
```

### Frontends (Vercel)

Rollback a deployment previo por proyecto:

```bash
# Web
vercel promote <deployment-url-or-id> --scope vybxliveauths-projects

# Promoter
vercel promote <deployment-url-or-id> --scope vybxliveauths-projects

# Admin
vercel promote <deployment-url-or-id> --scope vybxliveauths-projects
```

Luego revalidar dominios:

```bash
cd /home/mr-x/Desktop/vybx-suite
pnpm probe:prod
```

## 5) QA funcional final (manual, bloqueante)

1. Web: login, listado, detalle, checkout, resultado de pago.
2. Promoter: login, dashboard, eventos, crear/editar, refunds.
3. Admin: login, dashboard, eventos, aprobaciones, usuarios, settings.
4. Seguridad: mutaciones sin CSRF deben fallar; con sesión válida deben pasar.
5. Datos: crear evento en admin/promoter y verificar visibilidad en web.

## 6) Gate de salida

Solo pasar a produccion abierta si:

1. `pnpm hardening:preprod` pasa completo.
2. Secretos rotados y registrados.
3. QA funcional final completo.
4. Plan de rollback probado y documentado.
