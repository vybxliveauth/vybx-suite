# Auditoría Mobile — vybx-suite

_Fecha: 2026-04-11 · Apps: web, admin, promoter_

---

## ALTA

### 1. Breakpoints mezclados: Tailwind `md:` vs CSS custom

**Apps:** web  
Tailwind usa `md:` = 768px. Los media queries en `globals.css` usan 540px, 640px, 430px. Ambos sistemas conviven sin regla clara — lo que se oculta a 768px con Tailwind puede seguir visible a 540px según CSS, o viceversa.  
**Fix recomendado:** Definir en `tailwind.config` breakpoints custom que coincidan con los de `globals.css` (`sm: 430px`, `md: 540px`, `lg: 768px`) y migrar gradualmente.

### 2. Safe-area insets no aplicados

**Apps:** web  
`env(safe-area-inset-*)` solo está en `.auth-shell` y `.checkout-summary-mobile`. El hero, las páginas legales (privacidad, términos) y la sección de eventos no lo tienen. En iPhone X+ y Android con notch, el contenido queda parcialmente oculto.  
**Fix recomendado:** Añadir `padding-top: max(Xrem, env(safe-area-inset-top))` a todos los wrappers de pantalla completa.

### 3. Botones de acción en tablas por debajo del mínimo táctil

**Apps:** admin  
Los botones de acción dentro de tablas (`h-7` = 28px, `size="sm"`) están 36% por debajo del mínimo recomendado de 44px (WCAG 2.5.5). Afecta todas las páginas: users, refunds, staff, promoters, events.  
**Fix recomendado:** `h-7 → h-9` en mobile; o envolver con `p-1` para ampliar el área táctil sin cambiar visualmente el botón.

### 4. Mezcla de sistemas de visibilidad (CSS clases vs Tailwind)

**Apps:** web  
Dos sistemas paralelos para mostrar/ocultar elementos:

- CSS: `.hidden-mobile { display: flex }` / `.mobile-only { display: none }`
- Tailwind: `md:hidden`, `hidden md:block`

Ambos activos en la misma app generan conflictos difíciles de depurar.  
**Fix recomendado:** Estandarizar en uno solo. Preferiblemente Tailwind por consistencia con el resto del stack.

### 5. Grid del carrusel — 5 breakpoints distintos

**Apps:** web  
`globals.css` tiene breakpoints de carrusel en: 430px, 700px, 768px, 1100px y uno más. Código duplicado, difícil de mantener.  
**Fix recomendado:** Consolidar a 3: mobile (≤430px), tablet (≤768px), desktop (>768px).

---

## MEDIA

### 6. Grillas de formulario no colapsan en mobile _(ya corregido)_

**Apps:** promoter, admin  
Formularios de Fecha/Hora y Ticket Tiers usaban `grid-cols-2` y `grid-cols-[fixed]` sin breakpoint mobile, causando overflow en pantallas pequeñas.  
**Estado:** Corregido — `grid-cols-1 sm:grid-cols-2` y `grid-cols-2 sm:grid-cols-[...]`.

### 7. KPI cards sin breakpoint intermedio (tablet)

**Apps:** admin, promoter  
El patrón `grid-cols-2 lg:grid-cols-4` salta directamente de 2 a 4 columnas. En tablets (768px–1024px) quedan 2 columnas con demasiado espacio vacío.  
**Fix recomendado:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` donde aplique.

### 8. Tablas sin overflow-x-auto _(ya corregido parcialmente)_

**Apps:** promoter  
La tabla de eventos del promoter carecía de `overflow-x-auto`, lo que causaría scroll horizontal de página en lugar de scroll interno de tabla.  
**Estado:** Corregido en `events/page.tsx`. Admin ya los tenía todos.

### 9. Jerarquía de columnas visibles en tablas _(ya corregido)_

**Apps:** promoter, admin  
Columnas más relevantes (Monto) aparecían más tarde que columnas secundarias (Fecha). Staff mostraba ambas columnas en el mismo breakpoint en lugar de escalonarlas.  
**Estado:** Corregido — jerarquía `sm → md → lg`.

### 10. Padding de alertas de error inconsistente _(ya corregido)_

**Apps:** promoter  
Errores standalone de página usaban `px-3 py-2 rounded-md` (igual que validaciones inline), sin diferenciación visual.  
**Estado:** Corregido a `px-4 py-3 rounded-lg`.

### 11. Sin max-width en el main content del admin

**Apps:** admin  
`PromoterShell` no limita el ancho del contenido principal. En monitores 4K (2560px+), el layout se extiende hasta el borde, haciendo las líneas de texto ilegiblemente largas.  
**Fix recomendado:** `<main className="... max-w-[1440px] mx-auto">`.

### 12. Padding top-level usando `5%` en lugar del token `--page-inline` _(ya corregido)_

**Apps:** web  
Hero section y páginas legales usaban `padding: X 5%` en lugar de `var(--page-inline)` (`clamp(12px, 2.1vw, 34px)`), rompiendo la consistencia del margen horizontal.  
**Estado:** Corregido.

### 13. Checkboxes de 16px — área táctil pequeña

**Apps:** admin  
Los checkboxes de selección en tablas (`size-4` = 16px) no cumplen el mínimo táctil. No causan overflow pero son difíciles de pulsar con el dedo.  
**Fix recomendado:** `size-5` o envolver en un `<label>` con padding.

---

## BAJA

### 14. Touch targets de paginación — 38px _(ya corregido)_

**Apps:** web  
`.pagination-btn` tenía `height: 38px`, por debajo del mínimo WCAG de 44px.  
**Estado:** Corregido a 44px.

### 15. Heading sizes no responsivos

**Apps:** admin, promoter  
Los títulos de página usan `text-xl` fijo sin reducción en mobile. En teléfonos < 360px puede quedar ajustado. Solo `events/[id]/page.tsx` del admin usa `text-2xl sm:text-3xl`.  
**Fix recomendado:** `text-lg sm:text-xl` como regla global para page titles.

### 16. Sidebar — ancho fijo en mobile

**Apps:** admin  
`--sidebar-width: 256px` es fijo. El sidebar ya se oculta en mobile mediante `hidden md:flex`, pero si llegara a mostrarse (overlay), en un teléfono de 320px dejaría solo 64px de contenido visible.  
No es un bug activo pero sí un riesgo si se cambia el comportamiento del sidebar.

### 17. Opacidad del overlay del sidebar no especificada

**Apps:** admin, promoter  
El overlay del sidebar mobile no tiene opacidad explícita definida en los estilos, depende del valor default del browser. Puede resultar demasiado oscuro o demasiado transparente según el contexto.  
**Fix recomendado:** `background: hsl(0 0% 0% / 0.45)` explícito.

### 18. Tamaños de texto con valores arbitrarios residuales

**Apps:** promoter  
`text-[11px]` en `events/[id]/page.tsx` — fuera del sistema tipográfico.  
**Estado:** Corregido a `text-xs`.

---

## Resumen

| Prioridad | Issues | Corregidos | Pendientes |
| --------- | ------ | ---------- | ---------- |
| Alta      | 5      | 0          | 5          |
| Media     | 8      | 5          | 3          |
| Baja      | 5      | 2          | 3          |
| **Total** | **18** | **7**      | **11**     |

Los 11 pendientes de Alta/Media requieren decisiones arquitectónicas (sistema de breakpoints, safe-area, max-width) o refactors de componentes completos (botones en tablas). No son fixes de una línea.
