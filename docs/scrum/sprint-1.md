# Sprint 1 · 23/09/2026 – 27/10/2026

## Planning

**Objetivo:** Mockups UI/UX aprobados, modelo de datos PostgreSQL + JSONB definido y prototipo web con datos estáticos listo para validación.

| Historias comprometidas | Story points comprometidos |
|---|---|
| [COMPLETAR por Ian: historias del Sprint 1 en Jira, con su clave PAR-xxx] | [COMPLETAR por Ian: SP comprometidos, del informe de velocidad de Jira] |

## Review: qué se entregó

Resumen del historial de Git de `main` en el rango del sprint:

| Fecha | Entregable | Autor | Evidencia |
|---|---|---|---|
| 23/09/2026 | Documentación de la primera evaluación: SRS v1.0, modelo C4 inicial, ADR-01 y ADR-02, matriz de trazabilidad y minuta de entrevista con la parroquia | Ian Coaquira | commit `e2f0c1e` |
| 25/10/2026 | Estructura inicial de la landing parroquial con React, Tailwind CSS y componentes por sección (prototipo con datos estáticos) | Samiel Trujillo | PR #1 |

Entregables del objetivo sin evidencia en el repositorio:

* Mockups UI/UX aprobados: [COMPLETAR: dónde están los mockups (Figma u otro) y quién los aprobó]
* Modelo de datos PostgreSQL + JSONB: los scripts de creación de las bases y sus seeds entraron a `main` el 28/10/2026 (commit `9fdab0c`, ya en el Sprint 2). [COMPLETAR: si el modelo se presentó antes en otro formato]

**Demostración a la parroquia:** la validación del prototipo prevista para el 26/10/2026 se reprogramó a la semana del 16/11/2026 por disponibilidad del párroco (Segundo Informe de Avance, sección 4).

## Retrospectiva

Preguntas para completar con el equipo (no se registran opiniones que el equipo no dio):

| Pregunta | Respuestas del equipo |
|---|---|
| ¿Qué salió bien? | [COMPLETAR con el equipo] |
| ¿Qué se debe mejorar? | [COMPLETAR con el equipo] |
| Acciones de mejora (acción, responsable, fecha) | [COMPLETAR con el equipo] |

**Hechos observables (insumo para la discusión):**

* Solo 2 commits llegaron a `main` en las 5 semanas del sprint, en 2 días distintos (23/09 y 25/10).
* Hubo 1 pull request fusionado (#1, de Samiel) y no tuvo una revisión aprobada registrada en GitHub.
* Mauricio no tuvo commits en `main` dentro del rango; su primer aporte de base de datos entró el 28/10, ya en el Sprint 2.
* La validación con la parroquia no se hizo dentro del sprint.

## Velocidad

| Story points comprometidos | Story points completados |
|---|---|
| [COMPLETAR por Ian: del informe de velocidad de Jira] | [COMPLETAR por Ian: del informe de velocidad de Jira] |

## Estadísticas del sprint

Salida de `docs/scrum/estadisticas.ps1` el 27/11/2026 (fuente de PRs: GitHub):

```text
== Sprint 1 (2026-09-23 a 2026-10-27, fin excluido) ==
Integrante          Commits  PRs fusionados
Ian Coaquira              1               0
Mauricio López            0               0
Samiel Trujillo           1               1
TOTAL                     2               1
PRs: #1
PRs con al menos una revisión aprobada en GitHub: 0 de 1
Días con commits: 2
Días con más commits: 2026-09-23 (1), 2026-10-25 (1)
```
