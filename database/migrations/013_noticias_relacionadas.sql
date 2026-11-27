-- Migración 013: relación N:M entre publicaciones y servicios o grupos pastorales (PAR-166.2).
BEGIN;

CREATE TABLE IF NOT EXISTS publicacion_servicio (
    publicacion_id int NOT NULL REFERENCES publicacion(id) ON DELETE CASCADE,
    servicio_id int NOT NULL REFERENCES servicio(id) ON DELETE CASCADE,
    CONSTRAINT publicacion_servicio_pk PRIMARY KEY (publicacion_id, servicio_id)
);

CREATE INDEX IF NOT EXISTS publicacion_servicio_servicio_idx
    ON publicacion_servicio (servicio_id);

CREATE TABLE IF NOT EXISTS publicacion_grupo_pastoral (
    publicacion_id int NOT NULL REFERENCES publicacion(id) ON DELETE CASCADE,
    grupo_pastoral_id int NOT NULL REFERENCES grupo_pastoral(id) ON DELETE CASCADE,
    CONSTRAINT publicacion_grupo_pastoral_pk PRIMARY KEY (publicacion_id, grupo_pastoral_id)
);

CREATE INDEX IF NOT EXISTS publicacion_grupo_pastoral_grupo_idx
    ON publicacion_grupo_pastoral (grupo_pastoral_id);

COMMIT;
