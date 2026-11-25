-- Migración 006: portada opcional (miniatura de la primera página) para cada boletín.
BEGIN;

ALTER TABLE boletin
    ADD COLUMN portada_id int NULL REFERENCES archivo_multimedia(id);

COMMIT;
