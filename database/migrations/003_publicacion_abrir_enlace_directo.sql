-- Migración 003: opción por publicación para que «Leer nota» abra directamente el enlace externo.
-- Por defecto (false), «Leer nota» abre el detalle en el portal y el enlace aparece allí dentro.
BEGIN;

ALTER TABLE publicacion
    ADD COLUMN abrir_enlace_directo boolean NOT NULL DEFAULT false;

COMMIT;
