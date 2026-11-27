# Plataforma Web y Sistema de Gestión Parroquial - Pasionistas

## Visión General del Proyecto
El proyecto tiene como objetivo desarrollar una plataforma web e integral de gestión para la congregación pasionista en Bolivia, bajo el dominio institucional pasionistas.org.bo. Inicialmente, el sistema abarcará a la Parroquia Señor de la Exaltación, la Parroquia de la Resurrección y sus capillas dependientes, como la de San Pablo de la Cruz.

### Implementado en la versión 2.0
* **Portal Web Público:** contenido por sede con la jerarquía Parroquia → Capilla → Comunidad; horarios de misas y de atención; sacramentos y grupos pastorales con página propia, galería, contacto y noticias relacionadas; noticias con filtros y paginación; calendario con vista por día y detalle de cada evento; proclamas matrimoniales con historial público y observaciones anónimas (con celular o correo obligatorio); boletines en visor superpuesto con descarga; videos institucionales de YouTube incrustados; buscador global; menú flotante en móvil; mapa y enlaces a redes sociales y WhatsApp.
* **Gestor de Contenidos (CMS):** panel en `/admin` con roles (Administrador, Párroco, Secretaría, Marketing y Coordinador de grupo) y permisos por rol; publicaciones con editor de bloques y estados (Borrador, En revisión, Publicado, Archivado); eventos, horarios, servicios, grupos, videos, sedes, proclamas, boletines, páginas, multimedia y usuarios; bandeja de observaciones a proclamas para el párroco; exportación CSV por pantalla con permiso por rol; bitácora de cambios y registro de consultas sin datos sensibles.
* **Infraestructura:** SPA en React, API REST en Node.js y Express, PostgreSQL 16, caché en Redis 7, archivos en Oracle Cloud Object Storage con CDN, e integración continua en GitHub Actions. La arquitectura vigente está en el [modelo C4 v2](docs/arquitectura/Arquitectura%20C4.md).

### Pospuesto (fuera de la versión 2.0)
* **Asistente virtual:** bot de atención 24/7 por WhatsApp o web y registro de consultas fuera de horario.
* **Integración con Microsoft 365:** sincronización del calendario con el tenant de la parroquia.
* **Sistema de Sacramentos:** registros sacramentales con "Notas Marginales" auditadas en las partidas de bautismo (ej. matrimonios posteriores o nulidades).

El alojamiento definitivo (servidores de la Universidad Católica Boliviana o una infraestructura en la nube) está pendiente de decisión; hoy el sistema corre en un servidor de pruebas.

## Miembros del Equipo (Consultora CodeForge)
El desarrollo y gestión del proyecto está a cargo de la consultora CodeForge, conformada por los siguientes integrantes:
* **Ian Jamid Coaquira Uriarte:** Director de Proyecto y Analista de Sistemas.
* **Mauricio Enrique López Botelo:** Arquitecto de Software y Desarrollador Backend.
* **Alejandro Samiel Trujillo Chuquimia:** Especialista en QA (Calidad) y Desarrollador Frontend.

### Stakeholders Consultados
* **Padre Gregorio y Padre Alberto:** Párrocos principales de la congregación.
* **Ing. Luis Rivera:** Desarrollador del sistema anterior y asesor en infraestructura / Tenant de Microsoft.
* **Daniela:** Encargada de Secretaría y usuaria principal del sistema administrativo.
* **Álvaro:** Encargado de Medios de Comunicación, línea gráfica y diseño.

## Cómo trabajamos

Todo cambio entra a `main` mediante un pull request (PR) revisado por otro integrante del equipo.

### Ramas
* Formato: `feature/`, `fix/`, `chore/`, `docs/` o `test/` seguido de un nombre en minúsculas con guiones (ej. `feature/lector-boletines`).
* Una rama por historia u observación, creada siempre desde `main` actualizado.

### Commits
* Formato en una sola línea: `[tipo] descripción` (tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`), en español, en imperativo, sin punto final y con un máximo de 100 caracteres.
* Sin cuerpo, trailers ni firmas automáticas. Cada integrante commitea su propio trabajo con su propia identidad de Git.

### Pull requests
* Completa todas las secciones de la plantilla `.github/pull_request_template.md`, indicando la historia u observación y el revisor asignado.
* El CI de GitHub (`convencion`, `backend`, `frontend` y `e2e`) debe estar en verde antes de fusionar.

### Revisión cruzada
* Cada PR requiere **1 aprobación de un integrante distinto del autor**; el autor asigna al revisor al abrir el PR.
* **Rotación de revisores:**

| Autor | Revisor asignado |
|---|---|
| Ian Coaquira (`@usuario-pendiente`) | Mauricio López (`@usuario-pendiente`) |
| Mauricio López (`@usuario-pendiente`) | Samiel Trujillo (`@usuario-pendiente`) |
| Samiel Trujillo (`@usuario-pendiente`) | Ian Coaquira (`@usuario-pendiente`) |

* **Qué revisa el revisor:**
  * El PR cumple exactamente lo pedido en la historia u observación.
  * Las pruebas cubren el cambio y pasan.
  * Los contratos de `docs/api/` están actualizados si cambia la API.
  * No se subieron secretos, credenciales ni archivos temporales.
  * La UI fue revisada en móvil y escritorio cuando aplica.
* **Cómo pedir cambios:** si algo falta o debe corregirse, selecciona *Request changes* en la revisión del PR con comentarios concretos; el autor corrige en la misma rama, vuelve a subir y solicita nueva revisión.

### Fusión
* Una vez aprobado y con el CI en verde, fusionar usando **Merge pull request** (commit de merge, sin squash) y borrar la rama después.

### Protección de `main`
* La rama `main` exige: cambios solo por PR, al menos 1 aprobación de otro integrante, checks del CI en verde y prohibición de push directo (incluido para administradores).
