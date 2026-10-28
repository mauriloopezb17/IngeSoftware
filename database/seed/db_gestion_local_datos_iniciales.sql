-- Datos iniciales de prueba para db_gestion_local
-- Ejecutar DESPUÉS de db_gestion_local.sql
-- Catálogos reales + algunos registros de ejemplo (ficticios).

BEGIN;

INSERT INTO configuracion_parroquia (id, nombre_parroquia, arquidiocesis, vicaria, direccion, ciudad, nombre_parroco, ruta_logo) VALUES
  (1, 'Parroquia Señor de la Exaltación', 'Arquidiócesis de La Paz', 'Vicaría Sur', 'Obrajes (dirección de ejemplo)', 'La Paz', 'P. Gregorio, C.P. (ejemplo)', 'C:/Parroquia/logo.png');

INSERT INTO usuario (nombre_usuario, nombre_completo, hash_contrasena, es_administrador) VALUES
  ('secretaria', 'Secretaría Parroquial (ejemplo)', '$argon2id$v=19$m=65536,t=3,p=4$EJEMPLO', true);

INSERT INTO tipo_sacramento (codigo, nombre) VALUES ('BAU', 'Bautismo'), ('PCO', 'Primera Comunión'), ('CON', 'Confirmación'), ('MAT', 'Matrimonio');
INSERT INTO ministro (nombre_completo, titulo) VALUES ('Gregorio (ejemplo)', 'P.');
INSERT INTO libro (tipo_sacramento_id, numero_libro, anio) VALUES (1, 45, 2026);
INSERT INTO persona (nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento) VALUES ('Ana Lucía', 'Quispe', 'Rojas', 'F', '2025-12-02'), ('Carlos', 'Quispe', 'Mamani', 'M', NULL);
INSERT INTO partida (libro_id, ministro_id, registrado_por, numero_partida, folio, fecha_celebracion) VALUES (1, 1, 1, 1, 1, '2026-02-07');
INSERT INTO participante VALUES (1, 1, 'TITULAR'), (1, 2, 'PADRE');
INSERT INTO nota_marginal (partida_id, registrado_por, tipo, fecha_hecho, lugar_hecho, descripcion) VALUES
  (1, 1, 'CONFIRMACION', '2026-09-20', 'Parroquia de la Resurrección', 'Recibió la Confirmación (dato de ejemplo).');

COMMIT;
