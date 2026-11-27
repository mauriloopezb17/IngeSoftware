-- Migración 010: observaciones anónimas (nombre_completo opcional) y acción VIEW en bitácora.
BEGIN;

ALTER TABLE observacion_proclama ALTER COLUMN nombre_completo DROP NOT NULL;

ALTER TABLE bitacora_cambio DROP CONSTRAINT IF EXISTS bitacora_cambio_accion_ck;

ALTER TABLE bitacora_cambio ADD CONSTRAINT bitacora_cambio_accion_ck
    CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'EXPORT', 'VIEW'));

COMMIT;
