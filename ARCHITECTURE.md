# VybeTickets Suite — Architecture

## Overview

Turborepo monorepo with 3 Next.js apps, 1 Expo mobile app, and a NestJS backend (separate repo).

```
apps/
  web/        → Public storefront (port 3000)
  admin/      → Back-office panel (port 3002)
  promoter/   → Promoter dashboard (port 3003)
  mobile/     → React Native / Expo app (Metro port 8081)

packages/
  api-client/    → HTTP client with auth refresh, CSRF, timeouts
  auth-client/   → Session store, auth guard, permission hooks
  edge-auth/     → Next.js middleware for JWT gate at the edge
  permissions/   → Role → permission resolution (admin + promoter)
  schemas/       → Zod schemas shared between frontend and backend
  types/         → Core TypeScript types (UserRole, events, tickets)
  ui/            → Shared Radix-based UI components
  tsconfig/      → Shared TS configs
```

Backend: `vybxliveauth/vybxlive-backoffice` (NestJS, port 3004)

## Auth Flow

```
Browser → Edge Middleware (@vybx/edge-auth)
  ├─ No token / expired → redirect /login
  ├─ Wrong role → redirect /login
  └─ Valid → pass through

Page loads → PromoterShell / AdminShell
  ├─ useAuthGuard() runs
  │   ├─ getUser() from session store
  │   ├─ If null → hydrateUserFromSession()
  │   │     ├─ GET /api/v1/users/me (cookie auth)
  │   │     ├─ If 401 → POST /api/v1/auth/refresh
  │   │     └─ If still fails → redirect to /login
  │   └─ Check role + permissions
  └─ Children render only AFTER user is set (gate in Shell)
```

**Token flow**: Cookie-based JWT. `access_token` (short-lived) + `refresh_token` (httpOnly). Both `auth-client` and `api-client` handle refresh independently — `api-client` retries on 401 if `retryOnUnauthorized: true`.

**Edge middleware** (`@vybx/edge-auth`): Parses JWT payload at the edge (no verification — just `exp` + `role` check). Fast rejection of expired/wrong-role tokens before hitting the app. Full validation happens server-side via `JwtAuthGuard`.

## Permission Model

```
@vybx/permissions
  ├─ AdminPermission  (18 permissions)
  │   ├─ SUPER_ADMIN → all
  │   ├─ ADMIN → all except users:manage, security:manage
  │   └─ USER/PROMOTER → none
  │
  └─ PromoterPermission (10 permissions)
      ├─ PROMOTER/ADMIN/SUPER_ADMIN → all
      └─ USER → none
```

Path-based resolution: `resolveAdminRequiredPermissionForPath("/events/new")` → `"events:create"`.

## API Client (`@vybx/api-client`)

- Auto-appends `/api/v1` to base URL
- CSRF token from cookie on mutating requests
- Configurable timeout (default 12s) with AbortController
- Optional 401 → refresh → retry cycle
- `normalizePaginatedPayload()` converts backend `{ items, pagination }` to `{ data, total, page, pageSize }`

## Validation (`@vybx/schemas`)

Zod schemas shared between frontend and backend:

| Schema                 | Where used                  |
| ---------------------- | --------------------------- |
| `loginSchema`          | AuthModal, checkout login   |
| `registerSchema`       | AuthModal registration step |
| `cartItemSchema`       | Cart store validation       |
| `checkoutActionSchema` | Checkout server action      |
| `attendeeSchema`       | Checkout buyer form         |
| `paginationSchema`     | Backend query validation    |

## Cart & Checkout

1. User selects tickets → `useCartStore.addItem()` (enforces single-event, max qty per tier)
2. Cart persisted to `sessionStorage` with 10-min reservation TTL
3. Checkout page validates attendee + cart via `@vybx/schemas`
4. Server action calls backend `POST /payments/create-cart-payment-intent`
5. Redirect to Stripe Checkout → webhook confirms → ticket issued

## Backend Guards (NestJS)

| Guard                | Purpose                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `JwtAuthGuard`       | Validates access_token signature + expiry                        |
| `RolesGuard`         | Checks `@Roles()` decorator against user role                    |
| `SurfaceOriginGuard` | Restricts admin endpoints to backoffice origin (bypassed in dev) |
| `UserThrottlerGuard` | Rate limiting (e.g., 25 req/60s on email-intent)                 |

## Analytics (`@vybx/analytics`)

Lightweight client-side event tracking with batching and `sendBeacon` for reliability.

```ts
const tracker = createAnalyticsClient({ endpoint: '/api/v1/analytics/events' });
tracker.track('checkout_started', { eventId: 'abc' });
```

Predefined event names in `AnalyticsEvents` constant (auth funnel, purchase funnel, promoter, admin).
Batches events (default: 10) and flushes on `visibilitychange` to avoid losing data on navigation.

## Maintenance Mode

- **Web**: Providers.tsx checks `GET /config/MAINTENANCE_MODE` on mount. If active, replaces entire app with maintenance screen.
- **Admin/Promoter**: `useMaintenanceMode()` hook polls every 60s. Shows amber warning banner in the shell — app stays functional so admins/promoters can still work.
- **Toggle**: SUPER_ADMIN controls via Settings page → PATCH `/config/ops`.

## Passkeys (Groundwork)

Client infrastructure ready in `@vybx/auth-client`:

- `isPasskeySupported()` / `isPasskeyPlatformAvailable()` — feature detection
- `createPasskeyCredential(options)` — WebAuthn registration (create)
- `getPasskeyAssertion(options)` — WebAuthn authentication (get)

Zod schemas in `@vybx/schemas/auth`: `passkeyRegistrationVerifySchema`, `passkeyAuthenticationVerifySchema`.

Backend endpoints scaffold ready in `vybxlive-backoffice`:

- `POST /auth/passkey/register/options` — generate registration challenge
- `POST /auth/passkey/register/verify` — store credential (attestation verification via `@simplewebauthn/server` pending)
- `POST /auth/passkey/authenticate/options` — generate authentication challenge
- `POST /auth/passkey/authenticate/verify` — verify assertion + issue JWT

**Pending**: Full server-side attestation/assertion verification with `@simplewebauthn/server`.

## Mobile Auth Flow

```
App boot → getAccessToken() from SecureStore
  ├─ No token → redirect /(auth)/login
  └─ Token exists → GET /auth/profile (Bearer)
       ├─ 200 → AuthContext.user populated → /(tabs)
       └─ Error → clearTokens() → /(auth)/login

Login/Register → mobileLogin() → POST /auth/login (X-Client: mobile)
  └─ Backend returns { access_token, refresh_token, user } in body
       └─ saveTokens() to SecureStore → AuthContext.user set

401 on any request → refreshAccessToken()
  └─ POST /auth/refresh (X-Client: mobile, refresh_token in body)
       ├─ 200 → saveTokens() → retry original request
       └─ Fail → clearTokens() → redirect to login
```

**Key difference from web**: Tokens stored in `expo-secure-store`, not cookies.
No CSRF header needed. `X-Client: mobile` header on all requests triggers
body-token response from the backend.

## Key Conventions

- **Port mapping**: web=3000, admin=3002, promoter=3003, mobile=8081(Metro), backend=3004
- **CSS**: Web app uses CSS custom properties + globals.css. Admin/promoter use Tailwind + shadcn/ui.
- **Mobile styling**: `StyleSheet.create` only — no Tailwind, no NativeWind (keep bundle lean).
- **State**: Web uses Zustand (cart). Admin/promoter/mobile use TanStack Query for server state.
- **Env var**: `NEXT_PUBLIC_API_URL` for Next.js apps, `EXPO_PUBLIC_API_URL` for mobile.
- **Tests**: `pnpm test` runs vitest on shared packages (permissions, auth-client, api-client). `pnpm test:e2e` runs Playwright against the web app.
