-- Migración 016: indexa el detalle de los sacramentos (servicio.detalle) y el contenido de los bloques de páginas.
BEGIN;

-- Extrae texto plano de un bloque de página (jsonb), omitiendo URLs, rutas y anclas.
CREATE OR REPLACE FUNCTION extraer_texto_bloque(doc jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT coalesce(string_agg(elem #>> '{}', ' '), '')
    FROM jsonb_path_query(doc, '$.**') AS elem
   WHERE jsonb_typeof(elem) = 'string'
     AND (elem #>> '{}') !~ '^(https?://|/|#)';
$$;

DROP INDEX IF EXISTS servicio_busqueda_gin_idx;

CREATE INDEX servicio_busqueda_gin_idx
  ON servicio USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(descripcion_corta, '')), 'B') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(detalle->'contenido'), '')), 'C')
  ));

CREATE INDEX IF NOT EXISTS bloque_busqueda_gin_idx
  ON bloque USING gin (
    to_tsvector('es_sin_tildes', coalesce(extraer_texto_bloque(contenido), ''))
  );

COMMIT;
