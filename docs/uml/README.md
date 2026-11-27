# Paquete UML

Diagramas UML de la Plataforma Web y Sistema de Gestión Parroquial (versión 2.0). Historia Jira PAR-241.

Todos se derivan del código del repositorio: las tablas de `database/db_portal_cms.sql` y `database/migrations/` (001 a 016), y los archivos de `backend/src/` (routes, middlewares, controllers, services y models). Complementan el [modelo C4 v2](../arquitectura/Arquitectura%20C4.md).

## Diagramas

| Diagrama | Propósito | Requisitos relacionados | Historia Jira |
|---|---|---|---|
| [Clases del dominio](clases-dominio.puml) ([PNG](clases-dominio.png)) | Entidades persistentes, sus atributos principales, multiplicidades y claves foráneas, agrupadas en los paquetes Seguridad, Comunidad, Contenido, Agenda, Proclamas, Medios y Auditoría. | RF-01, RF-02, RF-04, RF-05, RF-06, RF-09, RF-11, RF-13, RF-17 a RF-25, RNF-06 | PAR-241 |
| [Capas del backend: publicaciones](capas-backend.puml) ([PNG](capas-backend.png)) | Patrón routes → middlewares → controllers → services → models, con los archivos y funciones reales del módulo de publicaciones. | RF-04, RF-11, RNF-01 | PAR-53, PAR-56 |
| [Secuencia: publicar una noticia](secuencia-publicar-noticia.puml) ([PNG](secuencia-publicar-noticia.png)) | Inicio de sesión con límite de intentos, creación del borrador con contenido JSONB, publicación y invalidación de la caché Redis después del COMMIT. Incluye los errores 400, 401, 403, 409 y 429. | RF-04, RF-11 | PAR-53, PAR-56 |
| [Secuencia: observación a una proclama](secuencia-observacion-proclama.puml) ([PNG](secuencia-observacion-proclama.png)) | Envío anónimo con contacto obligatorio, límite por IP, token de verificación y campo trampa; consulta del párroco en su bandeja con registro en la bitácora. Incluye los errores 400, 401, 403, 404, 409 y 429. | RF-18, RF-02 | PAR-164 |
| [Secuencia: exportación CSV](secuencia-exportar-csv.puml) ([PNG](secuencia-exportar-csv.png)) | Exportación con los mismos filtros de la pantalla, permiso por rol, tope de 10 000 filas, protección contra CSV injection, registro EXPORT en la bitácora y registro de la consulta sin datos sensibles. Incluye los errores 400, 401, 403 y 422. | RF-16, RF-11, RNF-07 | PAR-159 |

## Entidades del diagrama de clases

| Paquete | Entidades (tabla) |
|---|---|
| Seguridad | `rol`, `usuario`, `usuario_grupo_pastoral` (asignación del Coordinador de grupo) y la matriz de permisos, que no es una tabla sino código (`backend/src/constantes/permisos.js`) |
| Comunidad | `tipo_sede`, `sede` (jerarquía por `sede_padre_id`), `red_social`, `sede_red_social`, `grupo_pastoral`, `servicio` (sacramentos y servicios), `pregunta_frecuente` |
| Contenido | `tipo_publicacion` (Aviso, Noticia, Nota de prensa), `estado_publicacion`, `categoria`, `publicacion`, `publicacion_servicio`, `publicacion_grupo_pastoral` (noticias relacionadas), `pagina`, `tipo_bloque`, `bloque` |
| Agenda | `categoria_evento`, `evento`, `tipo_horario`, `horario`. Los avisos son publicaciones de tipo «Aviso». |
| Proclamas | `proclama`, `proclama_publicacion`, `observacion_proclama` |
| Medios | `archivo_multimedia`, `boletin`, `video` |
| Auditoría | `bitacora_cambio` |

## Decisiones y aclaraciones

- **Tablas que no se dibujan:** `conversacion_bot` y `mensaje_bot` existen en el esquema base, pero ningún código las usa: el bot asistente está pospuesto fuera de la v2.0. Tampoco se dibuja la columna `evento.id_externo_m365`, reservada para la integración con Microsoft 365, también pospuesta.
- **No hay versiones de publicaciones:** el esquema no guarda historial de versiones; el historial de cambios queda en `bitacora_cambio` (datos anteriores y nuevos en JSONB).
- **Composición:** solo `observacion_proclama` se borra en cascada con su proclama (`ON DELETE CASCADE`); el resto de relaciones son asociaciones.
- **`proclama.tramite_origen_id`:** es opcional desde la migración 002 y no tiene clave foránea en esta base.
- **Bitácora de observaciones:** al crearse, una observación **no** se registra en la bitácora, para no guardar datos personales en ella. Lo que se registra (acción VIEW) es cada consulta del párroco a la bandeja o a una observación, sin nombre, correo, teléfono ni mensaje.
- **Límite de observaciones:** usa `express-rate-limit` con su almacenamiento en memoria del proceso (5 envíos por hora por IP), no Redis; si la API se reinicia, el conteo vuelve a cero.
- **Coordinador de grupo:** desde el PR #74 también redacta noticias de sus grupos y las envía a revisión; no las publica ni exporta.

## Cómo regenerar las imágenes

Requiere Java. No requiere Graphviz: los diagramas usan el motor de diseño `smetana` o el de secuencias.

```bash
java -jar plantuml.jar -charset UTF-8 -tpng docs/uml/*.puml
```
