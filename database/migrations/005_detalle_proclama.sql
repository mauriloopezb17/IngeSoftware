-- Migración 005: detalle opcional de cada proclama (foto principal, galería, descripción y lugar).
BEGIN;

ALTER TABLE proclama
    ADD COLUMN imagen_id int NULL,
    ADD COLUMN detalle jsonb NULL;

ALTER TABLE proclama ADD CONSTRAINT proclama_archivo_multimedia
    FOREIGN KEY (imagen_id)
    REFERENCES archivo_multimedia (id)
    NOT DEFERRABLE
    INITIALLY IMMEDIATE;

COMMIT;
