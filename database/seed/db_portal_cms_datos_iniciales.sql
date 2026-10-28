-- Datos iniciales de prueba para db_portal_cms
-- Ejecutar DESPUÉS de db_portal_cms.sql
-- Catálogos reales + algunos registros de ejemplo (ficticios).

BEGIN;

INSERT INTO tipo_sede (nombre) VALUES ('Parroquia'), ('Capilla');

INSERT INTO sede (tipo_sede_id, sede_padre_id, nombre, slug, direccion, telefono, configuracion) VALUES
  (1, NULL, 'Parroquia Señor de la Exaltación', 'senor-de-la-exaltacion', 'Obrajes, La Paz (dirección de ejemplo)', '(2) 278 0000',
   '{"color_primario": "#231F20", "color_acento": "#E2AD11", "texto_barra_superior": "Hoy: Santa Misa 7:00 · 19:00", "url_video_hero": "https://s3.ejemplo/dron-0002.mp4"}'),
  (1, NULL, 'Parroquia de la Resurrección', 'resurreccion', 'La Paz', NULL, '{}'),
  (2, 1, 'Capilla San Pablo de la Cruz', 'capilla-san-pablo-de-la-cruz', 'La Paz', NULL, '{}');

INSERT INTO red_social (nombre, icono) VALUES ('Facebook', 'facebook'), ('Instagram', 'instagram'), ('YouTube', 'youtube'), ('TikTok', 'tiktok'), ('WhatsApp', 'chat');

INSERT INTO rol (nombre, descripcion) VALUES
  ('Administrador', 'Equipo técnico CodeForge / soporte'),
  ('Párroco', 'Valida y define contenido pastoral'),
  ('Secretaría', 'Gestiona avisos, calendario, horarios y consultas del bot'),
  ('Marketing', 'Publica noticias, multimedia y contenido de difusión');

INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena) VALUES
  (3, 1, 'Secretaría Parroquial (ejemplo)', 'secretaria@pasionistas.org.bo', '$argon2id$v=19$m=65536,t=3,p=4$EJEMPLO');

INSERT INTO estado_publicacion (nombre) VALUES ('Borrador'), ('Publicado'), ('Archivado');

INSERT INTO tipo_bloque (codigo, nombre, esquema_validacion) VALUES
  ('hero_video', 'Portada con video', '{"type": "object", "required": ["titulo", "url_video"], "properties": {"titulo": {"type": "string"}, "subtitulo": {"type": "string"}, "url_video": {"type": "string"}, "url_poster": {"type": "string"}, "botones": {"type": "array"}}}'),
  ('texto_imagen', 'Texto con imagen', '{"type": "object", "required": ["titulo", "texto"], "properties": {"titulo": {"type": "string"}, "texto": {"type": "string"}, "url_imagen": {"type": "string"}, "posicion_imagen": {"enum": ["izquierda", "derecha"]}}}'),
  ('tarjetas', 'Grilla de tarjetas', '{"type": "object", "required": ["items"], "properties": {"titulo": {"type": "string"}, "items": {"type": "array"}}}'),
  ('cita', 'Cita destacada', '{"type": "object", "required": ["texto"], "properties": {"texto": {"type": "string"}, "autor": {"type": "string"}}}'),
  ('galeria', 'Galería de fotos', '{"type": "object", "required": ["imagenes"], "properties": {"imagenes": {"type": "array"}}}'),
  ('video_youtube', 'Video de YouTube', '{"type": "object", "required": ["youtube_video_id"], "properties": {"youtube_video_id": {"type": "string"}}}');

INSERT INTO pagina (sede_id, estado_publicacion_id, creado_por, slug, titulo, mostrar_en_menu, orden_menu) VALUES
  (1, 2, 1, 'inicio', 'Inicio', false, 0),
  (1, 2, 1, 'nosotros', 'Quiénes somos', true, 1);

INSERT INTO bloque (pagina_id, tipo_bloque_id, orden, contenido) VALUES
  (1, 1, 1, '{"titulo": "Señor de la Exaltación", "subtitulo": "Una comunidad que camina junto a Cristo crucificado y resucitado.", "url_video": "https://s3.ejemplo/dron-0002.mp4", "url_poster": "https://s3.ejemplo/dron-poster.jpg", "botones": [{"texto": "Ver horarios de misa", "enlace": "#horarios"}]}'),
  (2, 4, 1, '{"texto": "Que la Pasión de Jesús esté siempre en nuestros corazones.", "autor": "Lema pasionista"}');

INSERT INTO tipo_publicacion (nombre) VALUES ('Noticia'), ('Aviso'), ('Nota de prensa');
INSERT INTO categoria (nombre, slug) VALUES ('Sacramentos', 'sacramentos'), ('Comunidad', 'comunidad'), ('Pasionistas', 'pasionistas');
INSERT INTO categoria_evento (nombre, color_hex) VALUES ('Liturgia', '#E2AD11'), ('Solemnidad', '#9E1B22'), ('Catequesis', '#B5532F'), ('Comunidad', '#3E9C97');
INSERT INTO tipo_horario (nombre) VALUES ('Santa Misa'), ('Confesiones'), ('Adoración'), ('Secretaría');

INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion) VALUES
  (1, 1, 1, '07:00', NULL, NULL), (1, 1, 1, '19:00', NULL, NULL),
  (1, 1, 6, '18:00', NULL, 'Misa vespertina dominical'),
  (1, 1, 7, '08:00', NULL, NULL), (1, 1, 7, '10:00', NULL, NULL), (1, 1, 7, '12:00', NULL, NULL), (1, 1, 7, '19:00', NULL, NULL),
  (1, 4, 1, '09:00', '12:00', NULL), (1, 4, 1, '15:00', '19:30', NULL);

INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, titulo, lugar, fecha_inicio) VALUES
  (1, 1, 2, 1, 'Vigilia de Todos los Santos', 'Templo parroquial', '2026-10-31 19:00-04'),
  (1, 3, 2, 1, 'Charla pre-bautismal para padres y padrinos', 'Salón parroquial', '2026-11-07 09:30-04');

INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, icono, contenido, orden) VALUES
  (1, 'bautismo', 'Bautismo', 'Charla pre-bautismal el primer sábado de cada mes.', 'agua',
   '{"requisitos": ["Certificado de nacimiento del niño", "Fotocopia de CI de padres y padrinos", "Padrinos confirmados"], "charla": {"frecuencia": "Primer sábado de cada mes", "hora": "09:30"}}', 1);

INSERT INTO pregunta_frecuente (sede_id, servicio_id, pregunta, respuesta) VALUES
  (1, 1, '¿Qué requisitos necesito para bautizar a mi hijo?', 'Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes.');

INSERT INTO proclama (sede_id, tramite_origen_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio) VALUES
  (1, 1, 'Juan Carlos M. Q. (ejemplo)', 'María Fernanda R. V. (ejemplo)', '2026-11-14 11:00-04');
INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion) VALUES (1, 1, '2026-10-25');

COMMIT;
