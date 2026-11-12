-- Migración 002: las proclamas ya no requieren un trámite de origen.
-- Se conserva la restricción UNIQUE (proclama_ak_1): en PostgreSQL los NULL no
-- chocan entre sí, así que pueden existir varias proclamas sin trámite.
BEGIN;

ALTER TABLE proclama ALTER COLUMN tramite_origen_id DROP NOT NULL;

COMMIT;
