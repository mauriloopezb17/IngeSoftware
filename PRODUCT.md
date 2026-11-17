# Product

Portal web y panel de gestión (CMS) de la **Parroquia Señor de la Exaltación**, comunidad de los Padres Pasionistas en Obrajes, La Paz (Bolivia).
Proyecto académico de Ingeniería de Software desarrollado para un cliente real (la parroquia). Requisitos en `docs/srs/`.

## Platform

web

## Stack

React 19 + Vite 8 + Tailwind CSS 4 (tokens en `frontend/src/index.css`, `@theme`) + React Router 7 + TanStack Query.
Íconos `lucide-react` (logos de redes sociales con `react-icons`). Backend Node + PostgreSQL + Redis; medios en OCI Object Storage.
API simulada con MSW (`VITE_USAR_MOCKS=true`). Pruebas: Vitest + Testing Library y Playwright.

## Users

- **Portal público**: feligreses, familias, novios, padres que preparan un bautizo, personas mayores y visitantes. Entran sobre todo desde el
  celular para saber a qué hora es la misa, qué requisitos piden para un sacramento, qué actividades hay y leer proclamas o noticias.
- **Panel de gestión**: secretaría parroquial, párroco, administrador y una persona de comunicación (marketing). No son técnicos.
  Publican noticias, avisos, eventos, proclamas matrimoniales, boletines, horarios y contenido de páginas.

## Product Purpose

Que la parroquia tenga una presencia digital propia, confiable y actualizada por su propio personal: información práctica (horarios,
sacramentos, contacto) a un toque, y la vida de la comunidad (noticias, calendario, proclamas, boletines) publicada sin depender de redes sociales.

## Positioning

La web de una parroquia con historia, no de una startup ni una plantilla genérica: serena, cálida y solemne en el portal; clara y rápida en el panel.

## Operating Context

- Público en La Paz, conexiones móviles variables; el contenido debe cargar rápido y verse bien a 375 px.
- La secretaría usa el panel en computadora de escritorio y a veces en tablet.
- El contenido lo gestiona la parroquia desde el CMS; el portal no debe tener textos inventados (si falta un dato: `[DATO PENDIENTE: …]`).

## Capabilities and Constraints

- Portal multipágina: `/`, `/nosotros`, `/horarios`, `/sacramentos`, `/sacramentos/:slug`, `/comunidad`, `/noticias`, `/calendario`,
  `/proclamas`, `/boletines`, `/contacto` y `/paginas/:slug` (páginas creadas en el CMS).
- Panel en `/admin` con permisos por rol (matriz en `frontend/src/admin/permisos/matriz.js`) y flujo de revisión de noticias.
- No hay formulario de contacto (no existe endpoint). No hay donaciones en línea.

## Brand Commitments

Definidos por el manual de logos de la parroquia y la skill `parroquia-design`, que manda sobre cualquier otra guía:
dorado `#ECB51C`, negro cálido `#231F1E` y blanco; Cormorant Garamond (títulos) + Montserrat (texto); logo oficial sin redibujar.
Nada de degradados decorativos, morados, azules, neón ni glassmorphism. Nunca texto dorado sobre fondo claro ni texto blanco sobre dorado.

## Evidence on Hand

- Fotos reales en `frontend/public/media/seed/` (exterior, altar, crucifijo, párroco, pastoral familiar) y video aéreo del templo.
- Logos oficiales en `frontend/src/assets/parroquia/logos/`.
- Referencia de animación elegida por los párrocos: holycrossusa.org (solo hero vivo y revelado suave al hacer scroll).
- Minuta de entrevista con la parroquia en `docs/entrevistas/`.

## Product Principles

1. Lo práctico primero: horarios y requisitos a un toque desde cualquier página.
2. Sobriedad: cada sección tiene un punto focal; no se repite el mismo bloque.
3. Contenido real: nada de texto de relleno.
4. El panel habla el idioma de la secretaría ("Publicar", "Guardar cambios"), sin jerga técnica.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste mínimo, foco visible, áreas táctiles de 44 px, un solo `h1` por página, textos de cuerpo de 17–18 px en el portal,
`prefers-reduced-motion` respetado, video de fondo con pausa. Español (Bolivia), zona horaria `America/La_Paz`.
