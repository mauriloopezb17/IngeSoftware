# Sprint 3 · 14/11/2026 – 27/11/2026

## Planning

**Objetivo (Jira):** Atender las observaciones del docente (paginación, exportación CSV por rol, logging, pruebas y revisión por PR), aplicar las correcciones del párroco, de los ingenieros y de marketing en el portal y el CMS, abrir las secciones de comunidades, Conoce el templo y Anécdotas, y dejar validada y documentada la entrega (SRS v1.1, trazabilidad, manual y transferencia).

**Historias del sprint en Jira** (22 historias, 88 SP; estado al 27/11/2026):

| Origen | Clave | Historia | Responsable | SP | Estado |
|---|---|---|---|---|---|
| Docente | PAR-158 | Paginación en servidor y filtros por categoría en todas las pantallas | Mauricio López | 8 | Finalizado |
| Docente | PAR-159 | Exportación CSV en cada pantalla con control de acceso por rol | Mauricio López | 5 | Finalizado |
| Docente | PAR-160 | Logging de consultas con filtros, usuario y tiempo de respuesta | Mauricio López | 3 | Finalizado |
| Docente | PAR-161 | Pruebas de filtros, paginación, exportación por rol y saneamiento | Samiel Trujillo | 5 | Finalizado |
| Docente | PAR-162 | Flujo de pull requests con revisión obligatoria | Samiel Trujillo | 2 | Finalizado |
| Párroco | PAR-163 | Detalle completo de cada fecha del calendario, editable por marketing | Mauricio López | 5 | Finalizado |
| Párroco | PAR-164 | Observaciones anónimas a las proclamas con celular o correo obligatorio | Mauricio López | 8 | Finalizado |
| Párroco | PAR-165 | Información extra y fotos de los novios en las proclamas | Samiel Trujillo | 3 | Finalizado |
| Párroco | PAR-166 | Sacramentos y grupos personalizables con fotos y noticias relacionadas | Mauricio López | 5 | Finalizado |
| Párroco | PAR-167 | Boletines en vista superpuesta con botón de descarga | Samiel Trujillo | 2 | Finalizado |
| Ingenieros y marketing | PAR-168 | Menú flotante persistente con los 4 botones principales (mobile-first) | Samiel Trujillo | 5 | Finalizado |
| Ingenieros y marketing | PAR-169 | Ajustes visuales: video de portada, menú, horarios y marca de agua del login | Samiel Trujillo | 3 | Finalizado |
| Marketing | PAR-170 | Buscador global del portal | Mauricio López | 5 | En curso |
| Ingenieros | PAR-171 | Jerarquía Parroquia → Capilla → Comunidad | Mauricio López | 5 | Finalizado |
| Ingenieros | PAR-172 | Grupos pastorales con fotos, información específica y contacto propio | Samiel Trujillo | 3 | Finalizado |
| Ingenieros | PAR-173 | Nuevo rol «Coordinador de grupo pastoral» | Mauricio López | 3 | En curso |
| Documentación | PAR-176 | SRS v1.1 y matriz de trazabilidad | Ian Coaquira | 3 | Finalizado |
| Seguimiento | PAR-180 | Informes de avance 1 y 2 y seguimiento del Sprint 3 | Ian Coaquira | 2 | Finalizado |
| Documentación | PAR-241 | Paquete UML | Ian Coaquira | 5 | Finalizado |
| Documentación | PAR-242 | Registro de ceremonias Scrum | Ian Coaquira | 3 | En revisión |
| Documentación | PAR-243 | Modelo C4 v2 | Ian Coaquira | 3 | Finalizado |
| Documentación | PAR-244 | ADR-03 y ADR-04 | Ian Coaquira | 2 | Finalizado |

Story points por integrante: Mauricio 47, Samiel 23, Ian 18.

Las secciones «Conoce el templo» y «Anécdotas» del objetivo están en la épica PAR-156, que no tiene historias propias dentro del sprint.

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

**Documentación del sprint** (pull requests de Ian abiertos el 27/11, en revisión): modelo C4 v2 (#78), ADR-03 y ADR-04 (#80), paquete UML (#82), SRS v1.1 y matriz de trazabilidad (#83), y este registro de ceremonias.

**No se entregó:** las secciones «Conoce el templo» y «Anécdotas» (épica PAR-156) no existen en el código; quedan planificadas (SRS v1.1, RF-26 y RF-27).

**Demostración a la parroquia:** la validación de las correcciones con la parroquia corresponde a la reunión de cierre del 27/11/2026, el último día del sprint (historia PAR-180). Su resultado, la conformidad de la contraparte y la operación del panel por personal de la parroquia se registran en el acta de esa reunión y en el Informe Final del proyecto social.

## Retrospectiva

Análisis del Scrum Master a partir de los datos del sprint (Jira, Git y GitHub).

**Qué salió bien**
* Se atendieron todas las observaciones del docente sobre paginación, exportación CSV por rol y registro de consultas, con pruebas automatizadas.
* El trabajo se repartió mejor que en el Sprint 2: Samiel pasó de 1 a 19 PRs fusionados; Mauricio tuvo 25.
* Se aplicaron casi todas las correcciones de la parroquia: 77 de 88 SP finalizados.
* La documentación de arquitectura y requisitos se actualizó al sistema construido (C4 v2, ADR-03 y ADR-04, UML, SRS v1.1).

**Qué mejorar**
* Ninguno de los 44 PRs fusionados tiene una revisión aprobada registrada en GitHub, aunque la convención del README (PAR-162) la exige.
* El trabajo volvió a concentrarse al final: 109 de los 121 commits de `main` se hicieron entre el 25/11 y el 27/11; entre el 19/11 y el 24/11 no hubo commits.
* Dos secciones del objetivo (Conoce el templo y Anécdotas) no se implementaron y no se descompusieron en historias.
* El tablero quedó desactualizado: PAR-170 y PAR-173 siguen «En curso» aunque su código ya está en `main` (PR #70, #72, #76, #73 y #74).
* La documentación se abrió en PR el último día del sprint.

**Acciones para el siguiente sprint**

| Acción | Responsable |
|---|---|
| Activar en GitHub la regla de protección de `main` que exige una aprobación antes de fusionar, para que la revisión cruzada no dependa de la buena voluntad | Mauricio López (administrador del repositorio) |
| Pasar a «Finalizado» en Jira cada historia en el mismo día en que se fusiona su PR | Ian Coaquira |
| Descomponer la épica PAR-156 en historias para «Conoce el templo» y «Anécdotas», con los insumos de la parroquia | Ian Coaquira |
| Integrar en `main` al menos una vez por semana para no concentrar el trabajo al final | Mauricio López y Samiel Trujillo |

## Velocidad

| Story points en el sprint | Story points completados | Cumplimiento |
|---|---|---|
| 88 | 77 | 88 % (pendientes al 27/11: PAR-170 y PAR-173 «En curso», PAR-242 «En revisión») |

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
