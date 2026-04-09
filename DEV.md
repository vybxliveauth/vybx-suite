# Guía de desarrollo local

## Prerequisitos

```bash
# Redis (requerido por el backend para sesiones JWT)
docker run -d -p 6379:6379 --name redis redis:alpine

# Verificar que Redis corre
docker ps | grep redis
```

PostgreSQL debe estar corriendo con la base de datos del proyecto configurada en el `.env` del backend.

---

## 1 — Backend

```bash
cd ~/Desktop/Proyectos/vybxlive-backend
npm run start:dev
```

Corre en → `http://localhost:3004`
Swagger docs → `http://localhost:3004/docs`

---

## 2 — Apps frontend

Cada una en una terminal separada, o todas juntas con Turborepo.

### Por separado

```bash
# Sitio público (VybeTickets)
cd ~/Desktop/vybx-suite
pnpm --filter "@vybx/web" dev
# → http://localhost:3000

# Panel de promotor
pnpm --filter "@vybx/promoter" dev
# → http://localhost:3001

# Panel de administración
pnpm --filter "@vybx/admin" dev
# → http://localhost:3002
```

### Todas juntas (Turborepo)

```bash
cd ~/Desktop/vybx-suite
pnpm dev
# Web      → http://localhost:3000
# Promotor → http://localhost:3001
# Admin    → http://localhost:3002
```

---

## 3 — Instalar dependencias

```bash
# Solo la primera vez, o cuando cambies package.json
cd ~/Desktop/vybx-suite
pnpm install
```

---

## 4 — Crear usuarios de prueba

```bash
cd ~/Desktop/Proyectos/vybxlive-backend

# Admin
npx ts-node --project tsconfig.json scripts/seed-admin.ts

# Promotor
npx ts-node --project tsconfig.json scripts/seed-promoter.ts
```

Credenciales creadas:

| Rol           | Email               | Password        |
| ------------- | ------------------- | --------------- |
| `SUPER_ADMIN` | `admin@vybx.dev`    | `Admin1234!@#`  |
| `PROMOTER`    | `promotor@vybx.dev` | `Promotor1234!` |

---

## 5 — Promover un usuario existente a SUPER_ADMIN

```bash
cd ~/Desktop/Proyectos/vybxlive-backend
npx prisma db execute --stdin <<< "UPDATE \"User\" SET role = 'SUPER_ADMIN' WHERE email = 'tu@email.com';"
```

---

## 6 — Prisma Studio (explorar la base de datos)

```bash
cd ~/Desktop/Proyectos/vybxlive-backend
npx prisma studio
# → http://localhost:5555
```

---

## 5 — App Móvil (Expo)

```bash
cd ~/Desktop/vybx-suite
pnpm --filter "@vybx/mobile" start   # Metro bundler → escanea QR con Expo Go
pnpm --filter "@vybx/mobile" android # emulador Android
pnpm --filter "@vybx/mobile" ios     # simulador iOS (macOS solamente)
```

### Variables de entorno mobile

`apps/mobile/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3004/api/v1
```

En producción usa la URL real del backend. Las variables `EXPO_PUBLIC_*` se
inyectan en tiempo de compilación por Metro (no son secretas).

### Requisito backend para mobile auth

El backend detecta la cabecera `X-Client: mobile` y devuelve los tokens en
el cuerpo de la respuesta (además de las cookies habituales):

```
POST /auth/login   → { access_token, refresh_token, user }
POST /auth/refresh → { access_token, refresh_token }  (con refresh_token en body)
```

Sin este cambio en `auth.controller.ts`, el flujo Bearer de la app no
funciona. El cambio ya está aplicado al controlador del backend.

---

## Puertos en uso

| Puerto | Servicio                       |
| ------ | ------------------------------ |
| 3000   | apps/web (sitio público)       |
| 3001   | apps/promoter (panel promotor) |
| 3002   | apps/admin (panel admin)       |
| 8081   | apps/mobile (Metro bundler)    |
| 3004   | vybxlive-backend (API)         |
| 5555   | Prisma Studio                  |
| 5432   | PostgreSQL                     |
| 6379   | Redis                          |

---

## Credenciales locales

### PostgreSQL

| Campo         | Valor                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Host          | `127.0.0.1`                                                                |
| Puerto        | `5432`                                                                     |
| Base de datos | `vybx`                                                                     |
| Usuario       | `vybxlive`                                                                 |
| Password      | `change_me_in_env`                                                         |
| URL completa  | `postgresql://vybxlive:change_me_in_env@127.0.0.1:5432/vybx?schema=public` |

### Redis

| Campo    | Valor       |
| -------- | ----------- |
| Host     | `127.0.0.1` |
| Puerto   | `6379`      |
| Password | `vybxlive`  |

### Usuario admin (seed)

| Campo    | Valor            |
| -------- | ---------------- |
| Email    | `admin@vybx.dev` |
| Password | `Admin1234!@#`   |
| Rol      | `SUPER_ADMIN`    |

### Emails con acceso al panel admin

Definidos en `ADMIN_ACCESS_ALLOWED_EMAILS`:

- `vybxlive.auth@gmail.com`
- `backoffice@vybxlive.com`

### API del backend

| Campo                                  | Valor                   |
| -------------------------------------- | ----------------------- |
| URL local                              | `http://localhost:3004` |
| `NEXT_PUBLIC_API_URL` (promoter / web) | `http://localhost:3004` |

---

## Variables de entorno por app

### `apps/promoter` y `apps/web` — `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3004
```

### `apps/admin` — sin `.env.local` (usa `http://localhost:3004` por defecto en `src/lib/api.ts`)

### `vybxlive-backend` — `.env`

```env
DATABASE_URL=postgresql://vybxlive:<db_password>@127.0.0.1:5432/vybx?schema=public
JWT_SECRET=<jwt_secret_min_64_chars>
PORT=3004
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<redis_password>
RESEND_API_KEY=<resend_api_key>
```

Nunca publiques claves reales en `.md`, `.env.example` ni commits.

---

## Beta release checklist

Antes de pasar a producción:

1. `pnpm lint` en verde (sin errores).
2. `pnpm typecheck` en verde.
3. `pnpm build` en verde para las 3 apps.
4. Validar login/refresh/logout en `web`, `promoter` y `admin` contra backend local.
5. Validar flujo de compra mínimo (home → evento → checkout → pago mock → tickets).
6. Confirmar que no hay secretos en el repo (`.env.local` no versionado).
7. Confirmar CORS y `NEXT_PUBLIC_API_URL` apuntando al entorno correcto.
8. Ejecutar smoke manual de rutas críticas antes de deploy.
