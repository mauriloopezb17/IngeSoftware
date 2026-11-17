---
name: Parroquia Señor de la Exaltación
colors:
  gold: "#ECB51C"
  ink: "#231F1E"
  white: "#FFFFFF"
  gold-dark: "#C9960A"
  gold-soft: "#FBF0D2"
  ink-soft: "#2E2927"
  cream: "#F7F3EC"
  sand: "#EAE2D6"
  muted: "#6B625D"
  muted-on-dark: "#B8AFA8"
  panel: "#FAF8F5"
  danger: "#9E1B22"
  danger-soft: "#F8E8E9"
  success: "#2F6B3F"
  success-soft: "#E5EFE7"
typography:
  display:
    fontFamily: Cormorant Garamond
    fontSize: clamp(2.75rem, 1.817rem + 3.98vw, 5rem)
    fontWeight: 600
    lineHeight: 1.05
  h1:
    fontFamily: Cormorant Garamond
    fontSize: clamp(2.25rem, 1.732rem + 2.21vw, 3.5rem)
    fontWeight: 600
    lineHeight: 1.1
  h2:
    fontFamily: Cormorant Garamond
    fontSize: clamp(1.875rem, 1.513rem + 1.55vw, 2.75rem)
    fontWeight: 600
    lineHeight: 1.15
  h3:
    fontFamily: Cormorant Garamond
    fontSize: clamp(1.375rem, 1.271rem + 0.44vw, 1.625rem)
    fontWeight: 600
    lineHeight: 1.25
  lead:
    fontFamily: Montserrat
    fontSize: clamp(1.125rem, 1.073rem + 0.22vw, 1.25rem)
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: Montserrat
    fontSize: clamp(1.0625rem, 1.037rem + 0.11vw, 1.125rem)
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: Montserrat
    fontSize: 0.9375rem
    fontWeight: 600
  eyebrow:
    fontFamily: Montserrat
    fontSize: clamp(0.75rem, 0.724rem + 0.11vw, 0.8125rem)
    fontWeight: 600
    letterSpacing: 0.2em
  meta:
    fontFamily: Montserrat
    fontSize: 0.875rem
    fontWeight: 500
  ui:
    fontFamily: Montserrat
    fontSize: 0.9375rem
    fontWeight: 400
rounded:
  sm: 2px
  md: 6px
spacing:
  section-mobile: 64px
  section-desktop: 112px
  gap-sm: 16px
  gap-md: 24px
  gap-lg: 32px
  gap-xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.gold-dark}"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    height: 44px
  badge-published:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.sm}"
  badge-scheduled:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
---

# Design System: Parroquia Señor de la Exaltación

La autoridad de marca es la skill `parroquia-design` (`~/.claude/skills/parroquia-design/SKILL.md`). Este archivo la resume para
herramientas de diseño; los tokens viven en `frontend/src/index.css` como utilidades de Tailwind.

## Overview

Dos interfaces con la misma marca y distinto tono. **Portal**: sereno, cálido y solemne; mucho aire, fotos reales grandes, títulos en
Cormorant y una sola animación de revelado. **Panel**: herramienta clara y compacta para la secretaría, solo Montserrat, feedback inmediato.

## Colors

### Primary
- **Dorado del logo** (`gold`): botón primario con texto `ink`, filetes, íconos y texto **solo sobre `ink`**.
- **Negro cálido del logo** (`ink`): texto principal, fondos oscuros (horarios, pie, sidebar).

### Neutral
`cream` para secciones alternas, `sand` para bordes, `muted` para texto secundario sobre claro, `muted-on-dark` sobre `ink`, `panel` para el fondo del CMS.

### Named Rules
- Nunca texto dorado sobre blanco o crema (≈1.9:1). Nunca texto blanco sobre dorado.
- `danger` y `success` solo con función (errores, estado publicado), nunca decorativos.
- Sin degradados (salvo el overlay `ink` del hero), sin morados ni azules, sin glassmorphism.

## Typography

Cormorant Garamond 600 para títulos; Montserrat 400/500/600 para todo lo demás. Escala fluida con utilidades `text-display`, `text-h1`,
`text-h2`, `text-h3`, `text-lead`, `text-body`, `text-button`, `text-eyebrow`, `text-meta` y `text-ui` (panel). No se usan otros tamaños en el portal.

### Hierarchy
Eyebrow (mayúsculas, `tracking-[0.2em]`, filete dorado) → título → bajada `text-lead` en `muted` → contenido. Textos largos en `max-w-prose`.

## Layout

Contenedor `max-w-7xl px-5 md:px-8`, grilla de 12 columnas en desktop. Secciones `py-16 md:py-28` en todo el sitio. Separaciones solo
`gap-4/6/8/12`. Eyebrow → título `mb-4`; título → contenido `mb-12`. Cada sección tiene un punto focal. Panel: sidebar `ink` de 260 px, topbar blanca, contenido sobre `panel`.

## Elevation & Depth

Casi plano. Sombras mínimas solo para menús desplegables, modales y toasts. Las tarjetas se separan con bordes `sand` o cambio de fondo.

## Shapes

Bordes casi rectos: `rounded-sm` o `rounded-md`. Círculos solo para avatares y el botón de pausa del video.

## Components

### Buttons
Primario dorado/tinta (hover `gold-dark`, texto sigue en tinta), secundario con borde, enlace con flecha. Altura mínima 44 px; estados hover, focus-visible, active y disabled.

### Cards / Containers
Hover en tarjeta del portal: `translateY(-4px)` y borde `gold` en 200 ms. Fotos con `scale(1.04)` dentro de un contenedor con overflow oculto.

### Inputs / Fields
Una columna, etiqueta arriba, ayuda debajo, error en `danger` con mensaje claro. Guardar (primario) y Cancelar (secundario).

### Navigation
Portal: barra superior con horarios y contacto, header con logo, menú y un único botón "Horarios de misa"; menú móvil a pantalla completa `ink`.
Panel: ítem activo con barra `gold` a la izquierda.

## Do's and Don'ts

### Do:
- Usar fotos reales de la parroquia y textos reales del CMS.
- Alternar fondos (blanco → `ink` → `cream`) y formatos (tarjetas, foto+texto, tabla, lista).
- Revelado al hacer scroll una sola vez (fade + 24 px, 600–800 ms, `ease-suave`), nada con `prefers-reduced-motion`.

### Don't:
- Bloques idénticos repetidos, texto gris pequeño, espaciados irregulares.
- Parallax fuerte, rebotes, contadores animados, carruseles automáticos, cursores personalizados.
- Botón de donaciones, emojis, una tercera fuente.
