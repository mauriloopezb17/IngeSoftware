-- Migración 009: jerarquía de sedes (Comunidad, Comunidad pasionista y orden entre hermanas).
BEGIN;

INSERT INTO tipo_sede (nombre)
VALUES ('Parroquia'), ('Capilla'), ('Comunidad'), ('Comunidad pasionista')
ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE sede
  ADD COLUMN IF NOT EXISTS orden smallint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS sede_padre_orden_idx
  ON sede (sede_padre_id, orden);

COMMIT;
