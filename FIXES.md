# Historial de Fixes — vybx-suite

## Funcionales

### Auth race condition (admin)

**Problema:** Los switches de Modo Mantenimiento / Sala de Espera / Alertas Operativas no eran interactivos, y los usuarios registrados no aparecían en el panel de admin.  
**Causa raíz:** `PromoterShell` renderizaba los hijos inmediatamente mientras el guard de auth corría en async. Los hooks de datos (queries, config) disparaban antes de que el JWT estuviera listo, causando doble refresh y redirect a login.

- `apps/admin/src/components/layout/PromoterShell.tsx` — gate en `useAuthUser()`: muestra spinner hasta que el usuario esté autenticado.
- `apps/admin/src/app/settings/page.tsx` — guard `userReady` en el effect de carga de config; spinner mientras `!opsInitialized`.
- `apps/admin/src/app/users/page.tsx` — queries gateadas con `enabled: authReady`.
- `apps/admin/src/lib/queries.ts` — parámetro `enabled` opcional en `useUsers` y `useAdminFraudSignals`.

### AuthModal — endpoint de email intent

**Problema:** `lookupEmailIntent()` probaba 5 endpoints en secuencia (404 por 404), añadiendo 200-1000ms de latencia innecesaria.  
**Fix:** `apps/web/src/components/features/AuthModal.tsx` — llamada directa a `/auth/email-intent`; fallback POST en 405, null en 404.

---

## Visuales — consistencia general (admin, promoter, web)

### Admin

| Archivo              | Fix                                                                  |
| -------------------- | -------------------------------------------------------------------- |
| `dashboard/page.tsx` | KPI padding `pb-1`→`pb-2`; iconos `size-3.5`→`size-4`                |
| `events/page.tsx`    | `space-y-5`→`space-y-6`; checkbox `accent-blue-500`→`accent-primary` |
| `payouts/page.tsx`   | Loading state `py-16`→`py-32`; checkbox accent                       |
| `promoters/page.tsx` | Loading state + checkbox accent                                      |
| `refunds/page.tsx`   | Checkbox `accent-blue-500`→`accent-primary`                          |
| `Sidebar.tsx`        | `text-[11px]`→`text-xs`                                              |
| `ActivityFeed.tsx`   | `text-[11px]`→`text-xs`                                              |
| `AuditTimeline.tsx`  | `text-[11px]`→`text-xs`                                              |
| `BulkActionBar.tsx`  | Colors hardcodeados→`bg-background/95`, `border-border/60`           |
| `ProDataTable.tsx`   | `border-white/10`→`border-border/60`                                 |

### Promoter

| Archivo            | Fix                                                     |
| ------------------ | ------------------------------------------------------- |
| `refunds/page.tsx` | Alert border `destructive/40`→`destructive/30`          |
| `staff/page.tsx`   | Alert border                                            |
| `sales/page.tsx`   | Chart tooltip y grid alineados con tokens del dashboard |

### Web

| Archivo       | Fix                                                                |
| ------------- | ------------------------------------------------------------------ |
| `globals.css` | Chips de categoría: padding `0.95rem`→`1.15rem`; gap `0`→`0.15rem` |

---

## Consistencia mobile (auditoría completa)

### Promoter

| Archivo                     | Fix                                                                               |
| --------------------------- | --------------------------------------------------------------------------------- |
| `events/new/page.tsx`       | Fecha/Hora: `grid-cols-2`→`grid-cols-1 sm:grid-cols-2`                            |
| `events/new/page.tsx`       | Ticket tiers: `grid-cols-[1fr_100px_100px_auto]`→`grid-cols-2 sm:grid-cols-[...]` |
| `events/[id]/edit/page.tsx` | Fecha/Hora: mismo fix                                                             |
| `events/[id]/edit/page.tsx` | Ticket tiers: `grid-cols-[1fr_100px_120px_auto]`→`grid-cols-2 sm:grid-cols-[...]` |
| `events/[id]/edit/page.tsx` | Server error: `px-3 py-2.5 rounded-md`→`px-4 py-3 rounded-lg`                     |
| `events/new/page.tsx`       | Server error: mismo fix                                                           |
| `events/page.tsx`           | Tabla: `CardContent` sin `overflow-x-auto`→agregado                               |
| `events/[id]/page.tsx`      | KPI grid: `sm:grid-cols-4`→`lg:grid-cols-4` (consistente con resto)               |
| `events/[id]/page.tsx`      | CardTitle `text-[11px]`→`text-xs`                                                 |
| `settings/page.tsx`         | Nombre/Apellido: `grid-cols-2`→`grid-cols-1 sm:grid-cols-2`                       |
| `refunds/page.tsx`          | Columnas tabla: Monto `md`→`sm`, Fecha `sm`→`md` (jerarquía correcta)             |
| `refunds/page.tsx`          | TableCells: mismo swap                                                            |
| `staff/page.tsx`            | Columnas tabla: Fecha `md`→`sm` (jerarquía progresiva)                            |
| `staff/page.tsx`            | TableCell Fecha: `md`→`sm`                                                        |

### Admin

| Archivo                | Fix                                                                           |
| ---------------------- | ----------------------------------------------------------------------------- |
| `events/[id]/page.tsx` | KPI grid: `sm:grid-cols-4`→`lg:grid-cols-4`                                   |
| `promoters/page.tsx`   | KPI grid: `grid gap-4 md:grid-cols-4`→`grid grid-cols-2 lg:grid-cols-4 gap-4` |
| `categories/page.tsx`  | KPI grid: `grid-cols-1 sm:grid-cols-3`→`grid-cols-2 sm:grid-cols-3`           |
| `users/page.tsx`       | Formulario crear usuario: `md:grid-cols-4`→`sm:grid-cols-2 md:grid-cols-4`    |
| `categories/page.tsx`  | Formulario crear categoría: `md:grid-cols-4`→`sm:grid-cols-2 md:grid-cols-4`  |
| `staff/page.tsx`       | Columna Fecha: `hidden md:table-cell`→`hidden sm:table-cell`                  |
| `staff/page.tsx`       | TableCell Fecha: mismo fix                                                    |

### Web

| Archivo               | Fix                                                                   |
| --------------------- | --------------------------------------------------------------------- |
| `page.tsx` (hero)     | Padding `6rem 5% 4rem`→`6rem var(--page-inline) 4rem`                 |
| `privacidad/page.tsx` | Padding `5rem 5% 6rem`→`5rem var(--page-inline) 6rem`                 |
| `terminos/page.tsx`   | Padding `5rem 5% 6rem`→`5rem var(--page-inline) 6rem`                 |
| `globals.css`         | `.pagination-btn`: `min-width/height 38px`→`44px` (WCAG touch target) |

---

## Hallazgos no corregidos (decisiones arquitectónicas)

- **Mezcla Tailwind / CSS custom** en web app — `md:` (768px) vs `@media (max-width: 540px)`. Requiere refactor mayor.
- **Safe-area insets** (`env(safe-area-inset-*)`) no aplicados a hero ni páginas legales — sin notch en esas vistas.
- **Botones de acción en tablas admin** (`h-7` = 28px) — por debajo del mínimo táctil. Cambiar requiere revisar layout completo de cada tabla.
- **Breakpoints del carrusel** — 5 breakpoints distintos (430px, 700px, 768px, 1100px). Consolidar a 3.
- **Max-width en main content admin** — sin `max-w-7xl`, puede quedar muy ancho en pantallas 4K.
