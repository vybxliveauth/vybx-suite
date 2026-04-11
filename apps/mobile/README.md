# Vybx Mobile (Expo)

## Probar en tu celular (Expo Go)

1. Instala **Expo Go** en tu teléfono.
2. En la raíz del monorepo, ejecuta:
   - `pnpm --filter @vybx/mobile start:lan`
3. Escanea el QR desde Expo Go.

## Si tu red bloquea LAN

- Usa:
  - `pnpm --filter @vybx/mobile start:tunnel`

## API usada por defecto en móvil

- `apps/mobile/.env.local` está configurado para:
  - `EXPO_PUBLIC_API_URL=https://api.vybxlive.com/api/v1`
  - `EXPO_PUBLIC_ACCOUNT_APP_URL=https://account.vybxlive.com`
- En produccion, el registro puede requerir verificacion anti-bot (Turnstile).
  Si falla desde la app, crea la cuenta en `https://vybxlive.com` y luego inicia sesion en mobile.
- Esta app mobile es solo para cuentas `USER` (usuario final).

## Cambiar a backend local (misma red Wi-Fi)

1. Levanta backend en tu laptop (puerto `3004`).
2. Cambia `apps/mobile/.env.local` a tu IP LAN:
   - `EXPO_PUBLIC_API_URL=http://<TU_IP_LAN>:3004/api/v1`
   - `EXPO_PUBLIC_ACCOUNT_APP_URL=http://<TU_IP_LAN>:3005`
3. Reinicia Expo:
   - `pnpm --filter @vybx/mobile start:clear`

## Login/registro desde navegador integrado

- La app abre `account` en una sesión segura del sistema (tipo Ticketmaster).
- Tras iniciar sesión o registrarte, vuelve a la app automáticamente con tokens mobile.

## Expo + GitHub (automatizado)

- Proyecto EAS enlazado: `@vybx/vybx-mobile`
- `apps/mobile/eas.json` define perfiles `development`, `preview`, `production`.
- Workflows GitHub:
  - `.github/workflows/expo-mobile-update.yml`
  - `.github/workflows/expo-mobile-build.yml`

### Secret requerido en GitHub

- `EXPO_TOKEN` en: `Settings > Secrets and variables > Actions`
- Con ese secret:
  - Cada push a `main` que toque `apps/mobile` publica OTA update en rama `production`.
  - Puedes lanzar builds iOS/Android manuales desde `Actions > Expo Mobile Build`.

## Hardening pre-release (mobile)

Comando unico para validar lo critico antes de release:

- `pnpm hardening:mobile-release`

Incluye:

- Typecheck de `@vybx/mobile`.
- Probe de auth mobile (headers/body/DTO regression).
- Probe de eventos mobile (contrato + paginacion + detalle + categorias).
- Probe base de dominios/health en produccion.

Opcional para validar login exitoso real:

- `MOBILE_PROBE_EMAIL='tu-email' MOBILE_PROBE_PASSWORD='tu-password' pnpm hardening:mobile-release`
