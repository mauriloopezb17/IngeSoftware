# Diagramas físicos de las bases de datos

Diagramas físicos (notación de ingeniería de la información, «pata de gallo») de los tres esquemas de `database/`. Cada uno se generó directamente a partir del SQL, de modo que muestra exactamente las tablas, columnas con su tipo de PostgreSQL, claves primarias, claves foráneas, restricciones de unicidad y la obligatoriedad (`NOT NULL`) definidas en los archivos.

| Base de datos | Archivo SQL | Diagrama | Tablas | Claves foráneas | Uso en la versión 2.0 |
|---|---|---|---|---|---|
| `db_portal_cms` | `database/db_portal_cms.sql` + `database/migrations/001` a `016` | [PNG](fisico-db-portal-cms.png) · [fuente](fisico-db-portal-cms.puml) | 32 | 56 | Base del sistema en uso: la API (`DATABASE_URL`), Docker y el CI la crean con `database/docker/00-iniciar-portal-cms.sh`. |
| `db_gestion_parroquial` | `database/db_gestion_parroquial.sql` | [PNG](fisico-db-gestion-parroquial.png) · [fuente](fisico-db-gestion-parroquial.puml) | 21 | 32 | Diseño del sistema de gestión parroquial en línea (sacramentos, partidas, notas marginales, trámites y certificados). La aplicación no la usa: el módulo de sacramentos está pospuesto (SRS v1.1, RF-03). |
| `db_gestion_local` | `database/db_gestion_local.sql` | [PNG](fisico-db-gestion-local.png) · [fuente](fisico-db-gestion-local.puml) | 10 | 10 | Diseño del sistema de gestión sin conexión para el equipo local de la parroquia. La aplicación no la usa (pospuesto junto con RF-03). |

## Cómo leer los diagramas

* **Asterisco (`*`)** antes de la columna: `NOT NULL`.
* **`«PK»`**, **`«FK»`**, **`«UQ»`**: clave primaria, clave foránea y valor único. Las restricciones de unicidad de varias columnas aparecen al final de la tabla como `UQ (col1, col2)`.
* **Relaciones:** `||` uno y solo uno; `|o` cero o uno; `|{` uno o muchos; `o{` cero o muchos. El lado de la tabla padre es `|o` cuando la clave foránea admite `NULL`. La etiqueta de cada línea es la columna de la clave foránea.
* **Solo en `db_portal_cms`:** como la base real se crea con el esquema base y luego las migraciones en orden, el diagrama muestra el resultado final. Lo que agrega una migración lleva la marca `«m0xx»` (por ejemplo, `revisado_por «m001»`), y las tablas creadas por migraciones aparecen en verde: `observacion_proclama` (007), `publicacion_servicio` y `publicacion_grupo_pastoral` (013) y `usuario_grupo_pastoral` (015). La columna `responsable` de `grupo_pastoral` es la antigua `contacto`, renombrada en la migración 011.

## Observaciones del esquema

* En `db_portal_cms` existen las tablas `conversacion_bot`, `mensaje_bot` y la columna `evento.id_externo_m365`, previstas para el bot y la integración con Microsoft 365. Están en el esquema, pero ninguna funcionalidad de la v2.0 las usa (ver el paquete UML en `docs/uml/`).
* La columna `proclama.tramite_origen_id` de `db_portal_cms` referencia un trámite de `db_gestion_parroquial`, pero no tiene clave foránea porque son bases distintas; desde la migración 002 es opcional.
* Los diagramas no incluyen índices ni restricciones `CHECK`; esos detalles están en los archivos SQL.

## Cómo regenerarlos

Los `.puml` se editan como texto. Para exportar las imágenes se necesita Java y PlantUML (no hace falta Graphviz, se usa el motor `smetana`):

```bash
java -DPLANTUML_LIMIT_SIZE=16384 -jar plantuml.jar -charset UTF-8 -tpng docs/base-de-datos/*.puml
```

Si cambia un archivo de `database/` (por ejemplo, una migración nueva), hay que actualizar el `.puml` correspondiente para que el diagrama siga reflejando el esquema.
