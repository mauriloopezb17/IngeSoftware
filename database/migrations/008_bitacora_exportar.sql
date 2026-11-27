-- Migración 008: permite registrar exportaciones (EXPORT) en la bitácora de cambios.
BEGIN;

ALTER TABLE bitacora_cambio DROP CONSTRAINT IF EXISTS bitacora_cambio_accion_ck;

ALTER TABLE bitacora_cambio ADD CONSTRAINT bitacora_cambio_accion_ck
    CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'EXPORT'));

COMMIT;
