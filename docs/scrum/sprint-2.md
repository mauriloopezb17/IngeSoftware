# Sprint 2 · 27/10/2026 – 14/11/2026

## Planning

**Objetivo (Jira):** Servidor CMS con editor de noticias tipo WordPress operativo, backend y API pública del portal listos, frontend conectado a la API con animaciones fluidas y documentación de avance (trazabilidad, manual del CMS y plan de despliegue).

**Historias del sprint en Jira** (12 historias, 73 SP):

| Clave | Historia | Responsable | SP | Estado |
|---|---|---|---|---|
| PAR-50 | Backend base y API pública REST del Portal Web | Mauricio López | 8 | Finalizado |
| PAR-51 | Caché Redis, seguridad y entorno local reproducible de la API | Mauricio López | 5 | Finalizado |
| PAR-52 | Autenticación y control de roles del panel de administración | Mauricio López | 5 | Finalizado |
| PAR-53 | Editor de noticias tipo WordPress (crear, editar y eliminar) | Mauricio López | 8 | Finalizado |
| PAR-54 | Barra de herramientas y formato del editor | Mauricio López | 5 | Finalizado |
| PAR-55 | Imágenes y biblioteca de medios del CMS | Mauricio López | 8 | Finalizado |
| PAR-56 | Flujo de publicación, programación y versiones de noticias | Mauricio López | 5 | Finalizado |
| PAR-57 | Gestión de eventos, avisos y secciones fijas desde el panel | Mauricio López | 5 | Finalizado |
| PAR-58 | Estructura del panel de administración y usabilidad para secretaría | Mauricio López | 3 | Finalizado |
| PAR-59 | Conexión del frontend del Portal con la API del backend | Samiel Trujillo | 8 | Finalizado |
| PAR-60 | Noticias en la página principal (carrusel, grilla y detalle) | Samiel Trujillo | 5 | Finalizado |
| PAR-61 | Animaciones fluidas de la página principal | Samiel Trujillo | 8 | Finalizado |

Story points por integrante: Mauricio 52, Samiel 21, Ian 0 (Ian coordinó el sprint y la relación con la parroquia; sus tareas de documentación del periodo no se registraron como incidencias de este sprint).

## Review: qué se entregó

Resumen de los 33 pull requests fusionados en el sprint (#2 a #35; el #31 no se fusionó):

| Área | Entregables | Pull requests |
|---|---|---|
| Fundación del proyecto | docker-compose con PostgreSQL 16 y Redis, plantilla de PR, acciones del CI, limpieza del frontend, migraciones y seed | #3, #4, #5, #6 |
| Contrato de la API | Contrato REST en `docs/api/` | #7 |
| API (backend) | Base de la API, API pública por sede y de publicaciones, autenticación JWT con roles, multimedia en Oracle Cloud, bitácora, catálogos y caché Redis, endpoints del panel | #8, #10, #13, #20, #22, #23, #27, #28, #29 |
| Panel CMS | Base del panel, multimedia, contenido de la parroquia, editor de noticias, eventos, avisos, proclamas, boletines, páginas, usuarios y bitácora | #9, #11, #14, #15, #17, #21, #25, #26 |
| Portal web | Secciones y navegación (Samiel), datos dinámicos, noticias, integración con la API y páginas públicas | #2, #12, #16, #19, #30, #35 |
| Pruebas y correcciones | Pruebas e2e de los flujos, corrección de la integración del panel, del seed, del CDN y del despliegue | #18, #24, #32, #33, #34 |

**Demostración a la parroquia:** el incremento se presentó el 17/11/2026, después del cierre del sprint. Asistieron el Padre Gregorio, el MSc. Ángel Ávila y el Ing. Luis Salinas; aprobaron el avance y pidieron las correcciones que se atendieron en el Sprint 3. Las pruebas del incremento se ejecutaron el 19/11/2026: 966 pruebas de backend y 599 de frontend aprobadas (Segundo Informe de Avance, secciones 2, 7 y 9).

**Producto demostrable:** servidor de pruebas https://parroquia.62344037.xyz/. Versión v1.0 publicada en Jira el 19/11/2026.

## Retrospectiva

Análisis del Scrum Master a partir de los datos del sprint (Jira, Git, GitHub y el Segundo Informe de Avance). Cada acción indica si se cumplió en el sprint siguiente.

**Qué salió bien**
* Se completaron las 12 historias del sprint (73 de 73 SP): API, CMS y portal conectados.
* Se instaló la base técnica del proyecto: entorno reproducible con Docker, CI con cuatro jobs, contrato de la API y pruebas e2e.
* El incremento quedó demostrable en un servidor de pruebas.

**Qué mejorar**
* La autoría quedó concentrada: 169 de 171 commits y 32 de 33 PRs son de Mauricio (el docente lo observó, Segundo Informe de Avance, sección 11).
* El trabajo se integró al final: 169 commits en 2 días (12/11 y 13/11).
* Ningún PR tuvo una revisión aprobada registrada en GitHub.
* La validación con la parroquia quedó fuera del sprint.

**Acciones**

| Acción | Responsable | Seguimiento en el Sprint 3 |
|---|---|---|
| Todo cambio entra a `main` por PR con revisión de otro integrante (PAR-162) | Samiel Trujillo | Parcial: la convención se documentó en el README (PR #46), pero ninguno de los 44 PRs del Sprint 3 tiene una aprobación registrada en GitHub. |
| Repartir las historias de desarrollo entre Mauricio y Samiel | Ian Coaquira | Cumplida: Samiel pasó de 1 a 19 PRs fusionados y de 2 a 50 commits. |
| Validar el incremento con la parroquia al inicio del Sprint 3 | Ian Coaquira | Cumplida: presentación del 17/11 y reunión con marketing del 18/11. |

## Velocidad

| Story points en el sprint | Story points completados | Cumplimiento |
|---|---|---|
| 73 | 73 | 100 % |

## Estadísticas del sprint

Salida de `docs/scrum/estadisticas.ps1` el 27/11/2026 (fuente de PRs: GitHub):

```text
== Sprint 2 (2026-10-27 a 2026-11-14, fin excluido) ==
Integrante          Commits  PRs fusionados
Ian Coaquira              0               0
Mauricio López          169              32
Samiel Trujillo           2               1
TOTAL                   171              33
PRs: #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #29, #30, #32, #33, #34, #35
PRs con al menos una revisión aprobada en GitHub: 0 de 33
Días con commits: 3
Días con más commits: 2026-11-13 (88), 2026-11-12 (81), 2026-10-28 (2)
```
