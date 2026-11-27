# Sprint 1 · 23/09/2026 – 27/10/2026

## Planning

**Objetivo (Jira):** Mockups UI/UX aprobados, modelo de datos PostgreSQL + JSONB definido y prototipo web con datos estáticos listo para validación.

**Incidencias del sprint en Jira** (9 incidencias, 37 SP):

| Clave | Tipo | Incidencia | Responsable | SP | Estado |
|---|---|---|---|---|---|
| PAR-15 | Historia | Diseño de los mockups UI/UX de la página web | Mauricio López | 5 | Finalizado |
| PAR-16 | Historia | Diseño y modelado de las bases de datos del proyecto (PostgreSQL + JSONB) | Mauricio López | 8 | Finalizado |
| PAR-17 | Historia | Prototipo de la página web con datos estáticos | Samiel Trujillo | 5 | Finalizado |
| PAR-42 | Tarea | Diagrama C4 Nivel 1 · Contexto | Ian Coaquira | 2 | Finalizado |
| PAR-43 | Tarea | Diagrama C4 Nivel 2 · Contenedores | Ian Coaquira | 3 | Finalizado |
| PAR-44 | Tarea | Diagrama C4 Nivel 3 · Componentes | Ian Coaquira | 3 | Finalizado |
| PAR-45 | Tarea | Documentar la arquitectura C4 y registrar ADR-01 y ADR-02 | Ian Coaquira | 3 | Finalizado |
| PAR-46 | Tarea | Redactar el SRS v1.0 (ISO/IEC/IEEE 29148) | Ian Coaquira | 5 | Finalizado |
| PAR-48 | Tarea | Elaborar la matriz de trazabilidad | Ian Coaquira | 3 | Finalizado |

Story points por integrante: Ian 19, Mauricio 13, Samiel 5.

## Review: qué se entregó

| Fecha | Entregable | Autor | Evidencia |
|---|---|---|---|
| 23/09/2026 | Documentación de la primera evaluación: SRS v1.0, modelo C4 inicial, ADR-01 y ADR-02, matriz de trazabilidad y minuta de entrevista con la parroquia | Ian Coaquira | commit `e2f0c1e`; PAR-42 a PAR-48 |
| Sprint 1 | Mockups UI/UX de la página web | Mauricio López | PAR-15 finalizada en Jira. Los archivos de los mockups no se versionaron en el repositorio; el sistema de diseño vigente se documentó después en `DESIGN.md` (17/11/2026). |
| Sprint 1 | Modelo de datos PostgreSQL + JSONB de las tres bases (portal y CMS, gestión parroquial y gestión local) | Mauricio López | PAR-16 finalizada en Jira; los scripts de creación y los seeds entraron a `main` el 28/10/2026 (commit `9fdab0c`, al inicio del Sprint 2). |
| 25/10/2026 | Estructura inicial de la landing parroquial con React, Tailwind CSS y componentes por sección (prototipo con datos estáticos) | Samiel Trujillo | PR #1; PAR-17 |

**Demostración a la parroquia:** la validación del prototipo prevista para el 26/10/2026 se reprogramó a la semana del 16/11/2026 por disponibilidad del párroco (Segundo Informe de Avance, sección 4).

## Retrospectiva

Análisis del Scrum Master a partir de los datos del sprint (Jira, Git y el Segundo Informe de Avance). Cada acción indica si se cumplió en el sprint siguiente.

**Qué salió bien**
* Se completaron las 9 incidencias comprometidas (37 de 37 SP).
* La documentación de la primera evaluación (SRS, C4, ADR y trazabilidad) se entregó completa el primer día del sprint.
* El prototipo con datos estáticos quedó listo antes del cierre (PR #1, 25/10).

**Qué mejorar**
* Casi nada del trabajo quedó en el repositorio: 2 commits en 5 semanas. Los mockups no se versionaron y el modelo de datos llegó a `main` recién en el Sprint 2.
* La validación con la parroquia no se hizo dentro del sprint.
* No existía todavía un flujo de pull requests, integración continua ni convención de commits.

**Acciones**

| Acción | Responsable | Seguimiento en el Sprint 2 |
|---|---|---|
| Versionar en el repositorio todo entregable técnico (modelo de datos, entorno, CI) | Mauricio López | Cumplida: scripts de bases de datos (28/10), docker-compose, plantilla de PR y CI (PR #3 a #6). |
| Conectar el prototipo a una API real | Mauricio López y Samiel Trujillo | Cumplida: API y portal conectados (PR #8 a #35). |
| Reprogramar la validación con el párroco | Ian Coaquira | Cumplida con atraso: se presentó el 17/11, ya en el Sprint 3. |

## Velocidad

| Story points en el sprint | Story points completados | Cumplimiento |
|---|---|---|
| 37 | 37 | 100 % |

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
