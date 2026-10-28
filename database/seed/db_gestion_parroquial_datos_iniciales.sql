-- Datos iniciales de prueba para db_gestion_parroquial
-- Ejecutar DESPUÉS de db_gestion_parroquial.sql
-- Catálogos reales + algunos registros de ejemplo (ficticios).

BEGIN;

INSERT INTO sede (codigo, nombre, tipo, arquidiocesis, vicaria, direccion) VALUES
  ('EXA', 'Parroquia Señor de la Exaltación', 'PARROQUIA', 'Arquidiócesis de La Paz', 'Vicaría Sur', 'Obrajes, La Paz'),
  ('RES', 'Parroquia de la Resurrección', 'PARROQUIA', 'Arquidiócesis de La Paz', NULL, 'La Paz');

INSERT INTO rol (nombre, descripcion) VALUES
  ('Administrador', 'Soporte técnico'),
  ('Párroco', 'Firma y valida partidas, notas marginales y certificados'),
  ('Secretaría', 'Registra partidas, trámites e intenciones de misa'),
  ('Consulta', 'Solo lectura');

INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena) VALUES
  (3, 1, 'Secretaría Parroquial (ejemplo)', 'secretaria@pasionistas.org.bo', '$argon2id$v=19$m=65536,t=3,p=4$EJEMPLO');

INSERT INTO tipo_sacramento (codigo, nombre) VALUES ('BAU', 'Bautismo'), ('PCO', 'Primera Comunión'), ('CON', 'Confirmación'), ('MAT', 'Matrimonio');

INSERT INTO tipo_participacion (nombre) VALUES
  ('Bautizado'), ('Comulgante'), ('Confirmado'), ('Contrayente'),
  ('Padre'), ('Madre'), ('Padrino'), ('Madrina'), ('Testigo');

INSERT INTO tipo_nota_marginal (nombre) VALUES
  ('Confirmación'), ('Matrimonio'), ('Nulidad matrimonial'), ('Ordenación sacerdotal'),
  ('Profesión religiosa'), ('Rectificación de datos');

INSERT INTO estado_tramite (nombre) VALUES ('Solicitado'), ('En revisión'), ('En proclamas'), ('Aprobado'), ('Celebrado'), ('Cancelado');

INSERT INTO requisito (tipo_sacramento_id, nombre, orden) VALUES
  (1, 'Certificado de nacimiento', 1), (1, 'Fotocopia CI de padres y padrinos', 2), (1, 'Charla pre-bautismal', 3),
  (4, 'Certificados de bautismo actualizados (con notas marginales)', 1), (4, 'Cursillo prematrimonial', 2), (4, 'Fotocopias de CI de contrayentes y testigos', 3);

INSERT INTO ministro (nombre_completo, titulo, cargo, congregacion) VALUES ('Gregorio (ejemplo)', 'P.', 'Párroco', 'Pasionistas C.P.');

INSERT INTO libro_sacramental (sede_id, tipo_sacramento_id, numero_libro, anio, fecha_apertura) VALUES (1, 1, 45, 2026, '2026-01-01'), (1, 4, 18, 2026, '2026-01-01');

INSERT INTO persona (nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento) VALUES
  ('Ana Lucía', 'Quispe', 'Rojas', 'F', '2025-12-02'),
  ('Carlos', 'Quispe', 'Mamani', 'M', NULL),
  ('Rosa', 'Rojas', 'Choque', 'F', NULL);

INSERT INTO partida (libro_id, ministro_id, registrado_por, numero_partida, folio, fecha_celebracion) VALUES (1, 1, 1, 1, 1, '2026-02-07');
INSERT INTO participante_partida VALUES (1, 1, 1), (1, 2, 5), (1, 3, 6);

INSERT INTO tramite (sede_id, tipo_sacramento_id, estado_tramite_id, registrado_por, fecha_programada) VALUES (1, 4, 3, 1, '2026-11-14 11:00-04');
INSERT INTO proclama (tramite_id, numero_proclama, fecha_publicacion) VALUES (1, 1, '2026-10-25');

INSERT INTO nota_marginal (partida_id, tipo_nota_marginal_id, registrado_por, fecha_hecho, parroquia_hecho, descripcion) VALUES
  (1, 1, 1, '2026-09-20', 'Parroquia de la Resurrección, La Paz', 'Recibió el sacramento de la Confirmación (dato de ejemplo).');

COMMIT;
