# Marco de trabajo Scrum del equipo CodeForge

Evidencia de cómo el equipo aplicó Scrum en la Plataforma Web y Sistema de Gestión Parroquial. Historia Jira PAR-242.

## Roles

| Integrante | Rol Scrum | Rol técnico |
|---|---|---|
| Ian Jamid Coaquira Uriarte | Scrum Master y Product Owner | Director de Proyecto y Analista de Sistemas: relación con la parroquia, requisitos, backlog y documentación |
| Mauricio Enrique López Botelo | Equipo de desarrollo | Arquitecto de Software y Desarrollador Backend |
| Alejandro Samiel Trujillo Chuquimia | Equipo de desarrollo | Especialista en QA y Desarrollador Frontend |

**Interesados (stakeholders):** Padre Gregorio (párroco), Ing. Luis Salinas y MSc. Ángel Ávila (sistemas de la parroquia), el equipo de marketing de la parroquia y el docente de SIS-213, Ing. M. Sc. Miguel Angel Pacheco Arteaga.

## Sprints

| Sprint | Inicio | Fin | Duración | Objetivo |
|---|---|---|---|---|
| [Sprint 1](sprint-1.md) | 23/09/2026 | 27/10/2026 | 5 semanas | Mockups UI/UX aprobados, modelo de datos PostgreSQL + JSONB definido y prototipo web con datos estáticos listo para validación. |
| [Sprint 2](sprint-2.md) | 27/10/2026 | 14/11/2026 | 2,5 semanas | Servidor CMS con editor de noticias tipo WordPress operativo, backend y API pública del portal listos, frontend conectado a la API con animaciones fluidas y documentación de avance. |
| [Sprint 3](sprint-3.md) | 14/11/2026 | 27/11/2026 | 2 semanas | Atender las observaciones del docente (paginación, exportación CSV por rol, logging, pruebas y revisión por PR), aplicar las correcciones del párroco, de los ingenieros y de marketing, abrir las secciones de comunidades, Conoce el templo y Anécdotas, y dejar validada y documentada la entrega. |

La duración de los sprints no fue fija: se ajustó a las fechas de evaluación de la materia y a la disponibilidad de la parroquia. Antes del Sprint 1, el 12/08/2026, se creó el repositorio (Acta de Constitución del proyecto).

## Ceremonias

| Ceremonia | Cómo se hizo | Evidencia |
|---|---|---|
| Sprint Planning | Objetivo del sprint e historias comprometidas en Jira. | Sección «Planning» de cada sprint; tablero de Jira. |
| Daily | [COMPLETAR con el equipo: frecuencia y canal de las reuniones diarias] | [Plantilla de dailies del Sprint 3](dailies-sprint-3.md). |
| Sprint Review | Demostración del incremento a la parroquia o al docente. | Sección «Review» de cada sprint; reuniones con la parroquia. |
| Retrospectiva | Qué salió bien, qué mejorar y acciones con responsable. | Sección «Retrospectiva» de cada sprint (por completar con el equipo). |

## Herramientas

* **Jira:** backlog, épicas, historias (claves PAR-xxx), sprints, story points e informe de velocidad.
* **GitHub:** repositorio `mauriloopezb17/IngeSoftware`, ramas por historia, pull requests y CI en GitHub Actions.
* **Convención de trabajo** (sección «Cómo trabajamos» del [README](../../README.md)): una rama por historia (`feature/`, `fix/`, `chore/`, `docs/`, `test/`), commits `[tipo] descripción`, todo cambio entra a `main` por pull request.

## Definition of Done

Una historia está terminada cuando cumple todo lo siguiente (tomado del README y de `.github/workflows/ci.yml`):

1. El cambio está en una rama con el formato de la convención y entra a `main` mediante un pull request con la plantilla completa (historia PAR-xxx y revisor asignado).
2. Los commits tienen el formato `[tipo] descripción` en una línea (job `convencion` del CI).
3. El backend pasa ESLint, Prettier y las pruebas de Vitest contra PostgreSQL 16 y Redis 7 (job `backend`).
4. El frontend pasa ESLint, las pruebas de Vitest y el build de producción (job `frontend`).
5. Las pruebas de punta a punta con Playwright pasan contra la API real (job `e2e`).
6. Las pruebas cubren el cambio y, si cambia la API, el contrato de `docs/api/` está actualizado.
7. No se suben secretos, credenciales ni archivos `.env`.
8. La interfaz se revisó en móvil y en escritorio cuando aplica.
9. Un integrante distinto del autor revisó y aprobó el pull request.

## Estadísticas por sprint

[`estadisticas.ps1`](estadisticas.ps1) (Windows) y [`estadisticas.sh`](estadisticas.sh) (Git Bash, Linux o macOS) imprimen los commits que llegaron a `main` y los pull requests fusionados por integrante y por sprint. Con GitHub CLI autenticado, el script de PowerShell usa el autor real de cada PR y sus revisiones aprobadas.

```powershell
powershell -ExecutionPolicy Bypass -File docs/scrum/estadisticas.ps1
```

La salida del 27/11/2026 está en cada archivo de sprint.
