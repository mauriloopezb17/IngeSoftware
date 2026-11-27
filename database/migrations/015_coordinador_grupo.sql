-- Migración 015: rol Coordinador de grupo y asignación a grupos pastorales (PAR-173.1).
BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM rol WHERE nombre = 'Administrador') THEN
        INSERT INTO rol (nombre, descripcion)
        VALUES (
            'Coordinador de grupo',
            'Edita únicamente la página, galería y contacto de sus grupos pastorales asignados.'
        )
        ON CONFLICT (nombre) DO NOTHING;
    ELSE
        -- En una base vacía antes del seed, reservamos el id 5 para no desplazar los ids 1..4 del seed.
        INSERT INTO rol (id, nombre, descripcion)
        VALUES (
            5,
            'Coordinador de grupo',
            'Edita únicamente la página, galería y contacto de sus grupos pastorales asignados.'
        )
        ON CONFLICT (nombre) DO NOTHING;
    END IF;
END $$;

CREATE TABLE usuario_grupo_pastoral (
    usuario_id int NOT NULL,
    grupo_pastoral_id int NOT NULL,
    CONSTRAINT usuario_grupo_pastoral_pk PRIMARY KEY (usuario_id, grupo_pastoral_id),
    CONSTRAINT usuario_grupo_pastoral_usuario_fk
        FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT usuario_grupo_pastoral_grupo_fk
        FOREIGN KEY (grupo_pastoral_id) REFERENCES grupo_pastoral (id) ON DELETE CASCADE
);

CREATE INDEX usuario_grupo_pastoral_grupo_idx
    ON usuario_grupo_pastoral (grupo_pastoral_id);

COMMIT;
