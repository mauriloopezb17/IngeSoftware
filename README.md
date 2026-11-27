# Plataforma Web y Sistema de Gestión Parroquial - Pasionistas

## Visión General del Proyecto
El proyecto tiene como objetivo desarrollar una plataforma web e integral de gestión para la congregación pasionista en Bolivia, bajo el dominio institucional pasionistas.org.bo. Inicialmente, el sistema abarcará a la Parroquia Señor de la Exaltación, la Parroquia de la Resurrección y sus capillas dependientes, como la de San Pablo de la Cruz.

La plataforma está estructurada en los siguientes componentes principales:
* **Portal Web Público:** Una interfaz amigable e informativa para la comunidad que muestra horarios de misas, requisitos para los sacramentos, detalles de los grupos parroquiales y enlaces a redes sociales.
* **Gestor de Contenidos (CMS):** Un panel de administración interno diseñado para que el personal de secretaría pueda publicar y actualizar dinámicamente el calendario de eventos, avisos y las proclamas matrimoniales sin requerir conocimientos técnicos.
* **Sistema de Sacramentos:** La modernización del sistema de registros actual, incorporando como requisito crítico la capacidad de añadir y auditar "Notas Marginales" en las partidas de bautismo (ej. para matrimonios posteriores o nulidades).
* **Integraciones y Asistente Virtual:** La plataforma contempla la integración de un bot de atención 24/7 para consultas frecuentes, visualización de videos institucionales de YouTube y sincronización con el tenant de Microsoft 365.

El sistema busca ser una solución escalable y centralizada, contemplando su posible alojamiento en los servidores de la Universidad Católica Boliviana (UCB) o en una infraestructura en la nube alternativa.

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

## Instalación local

Pasos completos, desde el `git clone` hasta los datos iniciales y de demostración: [docs/operacion/instalacion-local.md](docs/operacion/instalacion-local.md).

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
