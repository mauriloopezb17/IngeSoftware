# Sprint 3 · 14/11/2026 – 27/11/2026

## Planning

**Objetivo:** Atender las observaciones del docente (paginación, exportación CSV por rol, logging, pruebas y revisión por PR), aplicar las correcciones del párroco, de los ingenieros y de marketing, abrir las secciones de comunidades, Conoce el templo y Anécdotas, y dejar validada y documentada la entrega.

**Historias comprometidas** (claves de Jira registradas en el SRS v1.1 y en las tareas de documentación):

| Origen | Historias |
|---|---|
| Docente | PAR-158 (paginación y filtros), PAR-159 (exportación CSV por rol), PAR-160 (registro de consultas) |
| Párroco | PAR-163 (detalle de eventos), PAR-164 (observaciones a proclamas), PAR-165 (información y fotos de los novios), PAR-166 (sacramentos y grupos personalizables), PAR-167 (visor de boletines) |
| Marketing | PAR-170 (buscador global) |
| Ingenieros de la parroquia | PAR-168 (menú flotante), PAR-171 (jerarquía de sedes), PAR-172 (página por grupo), PAR-173 (rol coordinador), PAR-174 (Conoce el templo), PAR-175 (Anécdotas) |
| Documentación | PAR-176 (SRS v1.1 y trazabilidad), PAR-241 (UML), PAR-242 (ceremonias Scrum), PAR-243 (C4 v2), PAR-244 (ADR-03 y ADR-04) |
| Otras | [COMPLETAR por Ian: resto de historias del sprint en Jira] |

| Story points comprometidos |
|---|
| [COMPLETAR por Ian: SP comprometidos, del informe de velocidad de Jira] |

## Review: qué se entregó

Resumen de los 44 pull requests fusionados en `main` en el sprint (#36 a #81):

| Área | Entregables | Pull requests |
|---|---|---|
| Observaciones del docente | Paginación y filtros en la API, el panel y el portal; registro de consultas; exportación CSV por rol; búsqueda en boletines y observaciones; convención de ramas y revisiones | #46, #51, #52, #55, #56, #57, #58, #59, #61 |
| Correcciones del párroco | Detalle de eventos del calendario, detalle y fotos de proclamas, observaciones anónimas a proclamas, lector de boletines, sacramentos con noticias relacionadas | #43, #44, #45, #48, #63, #64, #71 |
| Correcciones de los ingenieros y de marketing | Jerarquía de sedes, página por grupo, menú flotante, buscador global (API, portal y contenido nuevo), rol coordinador de grupo y sus noticias | #65, #66, #68, #70, #72, #73, #74, #76 |
| Diseño del portal | Sistema de diseño, rediseño, animaciones, video de portada y revisión visual en móvil y escritorio | #36, #37, #40, #41, #53, #67, #75 |
| Pruebas y CI | Saneamiento de parámetros, listados y exportación, privacidad, estabilización de pruebas del panel y e2e, instalación de Chromium en el CI | #54, #60, #62, #69, #77, #79 |
| Correcciones generales | Contenido pegado y enlaces externos, retroalimentación, subida de archivos, mapa «cómo llegar», filtro de la bitácora, ventanas superpuestas y cierre del sprint | #38, #39, #42, #47, #49, #50, #81 |

**Documentación del sprint** (pull requests abiertos al cierre, pendientes de revisión): modelo C4 v2 (#78), ADR-03 y ADR-04 (#80), paquete UML (#82), SRS v1.1 y matriz de trazabilidad (#83), y este registro de ceremonias.

**No se entregó:** las secciones «Conoce el templo» (PAR-174) y «Anécdotas» (PAR-175) no existen en el código; quedan planificadas (SRS v1.1, RF-26 y RF-27).

**Demostración a la parroquia:** [COMPLETAR: fecha, asistentes y resultado de la validación de las correcciones con el párroco, marketing e ingenieros, y quién operó el panel sin ayuda del equipo]

## Retrospectiva

Preguntas para completar con el equipo (no se registran opiniones que el equipo no dio):

| Pregunta | Respuestas del equipo |
|---|---|
| ¿Qué salió bien? | [COMPLETAR con el equipo] |
| ¿Qué se debe mejorar? | [COMPLETAR con el equipo] |
| Acciones de mejora (acción, responsable, fecha) | [COMPLETAR con el equipo] |

**Hechos observables (insumo para la discusión):**

* El trabajo se repartió más que en el Sprint 2: Samiel pasó de 2 a 50 commits y de 1 a 19 PRs fusionados; Mauricio tuvo 71 commits y 25 PRs.
* Los 121 commits se hicieron en 5 días; 109 de ellos entre el 25/11 y el 27/11 (52 solo el 27/11).
* Ninguno de los 44 PRs fusionados tiene una revisión aprobada registrada en GitHub, aunque la convención del README pide la aprobación de un integrante distinto del autor.
* Los PRs de documentación de Ian se abrieron el último día del sprint y no estaban fusionados al cierre; por eso Ian figura con 0 commits en `main`.
* Dos secciones del objetivo (Conoce el templo y Anécdotas) no se implementaron.

## Velocidad

| Story points comprometidos | Story points completados |
|---|---|
| [COMPLETAR por Ian: del informe de velocidad de Jira] | [COMPLETAR por Ian: del informe de velocidad de Jira] |

## Estadísticas del sprint

Salida de `docs/scrum/estadisticas.ps1` el 27/11/2026 (fuente de PRs: GitHub):

```text
== Sprint 3 (2026-11-14 a 2026-11-28, fin excluido) ==
Integrante          Commits  PRs fusionados
Ian Coaquira              0               0
Mauricio López           71              25
Samiel Trujillo          50              19
TOTAL                   121              44
PRs: #36, #37, #38, #39, #40, #41, #42, #43, #44, #45, #46, #47, #48, #49, #50, #51, #52, #53, #54, #55, #56, #57, #58, #59, #60, #61, #62, #63, #64, #65, #66, #67, #68, #69, #70, #71, #72, #73, #74, #75, #76, #77, #79, #81
PRs con al menos una revisión aprobada en GitHub: 0 de 44
Días con commits: 5
Días con más commits: 2026-11-27 (52), 2026-11-25 (34), 2026-11-26 (23)
```
