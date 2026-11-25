-- Migración 004: detalle enriquecido por evento (PAR-163, RNF-06).
-- Guarda en un solo JSONB el contenido BlockNote, dirección, enlace de mapa, programa, responsable y enlaces.
BEGIN;

ALTER TABLE evento
    ADD COLUMN detalle jsonb NULL;

COMMIT;
