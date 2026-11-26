-- Migración 007: observaciones confidenciales sobre proclamas matrimoniales para el párroco.
BEGIN;

CREATE TABLE observacion_proclama (
    id serial NOT NULL,
    proclama_id int NOT NULL,
    nombre_completo varchar(120) NOT NULL,
    correo varchar(120) NULL,
    telefono varchar(30) NULL,
    mensaje text NOT NULL,
    fecha_envio timestamptz NOT NULL DEFAULT now(),
    leido_en timestamptz NULL,
    leido_por int NULL,
    CONSTRAINT observacion_proclama_contacto_ck CHECK (correo IS NOT NULL OR telefono IS NOT NULL),
    CONSTRAINT observacion_proclama_mensaje_ck CHECK (char_length(mensaje) BETWEEN 10 AND 2000),
    CONSTRAINT observacion_proclama_pk PRIMARY KEY (id)
);

ALTER TABLE observacion_proclama ADD CONSTRAINT observacion_proclama_proclama
    FOREIGN KEY (proclama_id)
    REFERENCES proclama (id)
    ON DELETE CASCADE
    NOT DEFERRABLE
    INITIALLY IMMEDIATE;

ALTER TABLE observacion_proclama ADD CONSTRAINT observacion_proclama_usuario
    FOREIGN KEY (leido_por)
    REFERENCES usuario (id)
    NOT DEFERRABLE
    INITIALLY IMMEDIATE;

CREATE INDEX observacion_proclama_proclama_fecha_idx
    ON observacion_proclama (proclama_id, fecha_envio DESC);

COMMIT;
