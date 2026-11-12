-- Migración 001: campos de revisión de las publicaciones.
-- Flujo: Marketing redacta -> En revisión -> el Párroco aprueba (Publicado) o
-- rechaza (vuelve a Borrador con una observación). Aquí se guarda quién revisó,
-- cuándo y la observación del rechazo.
BEGIN;

-- Quién revisó la publicación, cuándo, y la observación (si fue rechazada).
ALTER TABLE publicacion
    ADD COLUMN revisado_por int NULL,
    ADD COLUMN fecha_revision timestamptz NULL,
    ADD COLUMN observacion_revision varchar(500) NULL;

-- Reference: publicacion_revisado_por (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_revisado_por
    FOREIGN KEY (revisado_por)
    REFERENCES usuario (id)
    NOT DEFERRABLE
    INITIALLY IMMEDIATE
;

-- El revisor y la fecha de revisión van siempre juntos: ambos vacíos o ambos con valor.
ALTER TABLE publicacion ADD CONSTRAINT publicacion_revision_ck
    CHECK ((revisado_por IS NULL) = (fecha_revision IS NULL));

COMMIT;
