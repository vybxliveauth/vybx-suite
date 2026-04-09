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
- En produccion, el registro puede requerir verificacion anti-bot (Turnstile).
  Si falla desde la app, crea la cuenta en `https://vybxlive.com` y luego inicia sesion en mobile.

## Cambiar a backend local (misma red Wi-Fi)

1. Levanta backend en tu laptop (puerto `3004`).
2. Cambia `apps/mobile/.env.local` a tu IP LAN:
   - `EXPO_PUBLIC_API_URL=http://<TU_IP_LAN>:3004/api/v1`
3. Reinicia Expo:
   - `pnpm --filter @vybx/mobile start:clear`
