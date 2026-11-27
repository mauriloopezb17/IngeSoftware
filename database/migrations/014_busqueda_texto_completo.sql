-- Migración 014: configuración de búsqueda de texto completo en español sin tildes e índices GIN.
BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'es_sin_tildes') THEN
    CREATE TEXT SEARCH CONFIGURATION es_sin_tildes (COPY = spanish);
  END IF;
END
$$;

ALTER TEXT SEARCH CONFIGURATION es_sin_tildes
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, spanish_stem;

-- Extrae texto plano de un documento BlockNote (jsonb) para indexación de texto completo.
CREATE OR REPLACE FUNCTION extraer_texto_blocknote(doc jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT coalesce(string_agg(elem #>> '{}', ' '), '')
    FROM jsonb_path_query(doc, '$.**.text') AS elem
   WHERE jsonb_typeof(elem) = 'string';
$$;

CREATE INDEX IF NOT EXISTS publicacion_busqueda_gin_idx
  ON publicacion USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(resumen, '')), 'B') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(contenido), '')), 'C')
  ));

CREATE INDEX IF NOT EXISTS evento_busqueda_gin_idx
  ON evento USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(descripcion, '')), 'B') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(lugar, '')), 'B') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(detalle->'contenido'), '')), 'C')
  ));

CREATE INDEX IF NOT EXISTS servicio_busqueda_gin_idx
  ON servicio USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(descripcion_corta, '')), 'B')
  ));

CREATE INDEX IF NOT EXISTS grupo_pastoral_busqueda_gin_idx
  ON grupo_pastoral USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(descripcion, '')), 'B') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(extraer_texto_blocknote(detalle->'contenido'), '')), 'C')
  ));

CREATE INDEX IF NOT EXISTS boletin_busqueda_gin_idx
  ON boletin USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(titulo, '')), 'A')
  ));

CREATE INDEX IF NOT EXISTS pagina_busqueda_gin_idx
  ON pagina USING gin ((
    setweight(to_tsvector('es_sin_tildes', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('es_sin_tildes', coalesce(descripcion_seo, '')), 'B')
  ));

COMMIT;
