# Sprint 2 · 27/10/2026 – 14/11/2026

## Planning

**Objetivo:** Servidor CMS con editor de noticias tipo WordPress operativo, backend y API pública del portal listos, frontend conectado a la API con animaciones fluidas y documentación de avance.

| Historias comprometidas | Story points comprometidos |
|---|---|
| [COMPLETAR por Ian: historias del Sprint 2 en Jira. Como referencia, la matriz de trazabilidad asocia a los Sprints 1 y 2 las historias PAR-8, 10, 11, 12, 13, 15, 17, 50 a 60] | [COMPLETAR por Ian: SP comprometidos, del informe de velocidad de Jira] |

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

**Demostración a la parroquia:** el avance se presentó a la parroquia el 17/11/2026, ya en el Sprint 3. Según el Segundo Informe de Avance, aprobaron el avance y pidieron las correcciones que se atendieron en el Sprint 3. Las pruebas se ejecutaron el 19/11/2026: 966 pruebas de backend y 599 de frontend aprobadas (Segundo Informe de Avance, secciones 2 y 7).

**Producto demostrable:** servidor de pruebas https://parroquia.62344037.xyz/.

## Retrospectiva

Preguntas para completar con el equipo (no se registran opiniones que el equipo no dio):

| Pregunta | Respuestas del equipo |
|---|---|
| ¿Qué salió bien? | [COMPLETAR con el equipo] |
| ¿Qué se debe mejorar? | [COMPLETAR con el equipo] |
| Acciones de mejora (acción, responsable, fecha) | [COMPLETAR con el equipo] |

**Hechos observables (insumo para la discusión):**

* De los 171 commits del sprint, 169 son de Mauricio, 2 de Samiel y ninguno de Ian.
* 169 de los 171 commits se hicieron en 2 días (81 el 12/11 y 88 el 13/11); hubo commits en solo 3 días del sprint.
* De los 33 PRs fusionados, 32 son de Mauricio y 1 de Samiel; ninguno tiene una revisión aprobada registrada en GitHub.
* El docente observó la concentración de commits en un integrante (Segundo Informe de Avance, sección 11); la acción planificada fue la revisión cruzada obligatoria por PR y ramas propias por integrante.
* La validación con la parroquia se hizo después del cierre del sprint.

## Velocidad

| Story points comprometidos | Story points completados |
|---|---|
| [COMPLETAR por Ian: del informe de velocidad de Jira] | [COMPLETAR por Ian: del informe de velocidad de Jira] |

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
