-- Migración 012: foto principal, galería y contenido enriquecido para cada servicio/sacramento (PAR-166.1).
BEGIN;

ALTER TABLE servicio
    ADD COLUMN IF NOT EXISTS imagen_id int NULL REFERENCES archivo_multimedia(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS detalle jsonb NULL;

COMMIT;
