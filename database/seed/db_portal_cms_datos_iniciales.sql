-- Datos iniciales de prueba para db_portal_cms
-- Ejecutar DESPUÉS de db_portal_cms.sql
-- Catálogos reales + algunos registros de ejemplo (ficticios).

BEGIN;

INSERT INTO tipo_sede (nombre) VALUES ('Parroquia'), ('Capilla');

-- Sedes. Los datos de la sede principal salen de la landing (Encabezado, Contacto,
-- PiePagina y Comunidades). Las otras dos solo muestran nombre, tipo y "La Paz" en la landing.
--  * whatsapp = NULL: el número aún no está confirmado (la landing solo muestra "WhatsApp Secretaría").
--  * Coordenadas: las del enlace de Google Maps de la landing (-16.5267952, -68.1082157),
--    redondeadas a 6 decimales por el tipo numeric(9,6).
--  * configuracion (JSONB) guarda lo que no tiene columna propia:
--      color_primario / color_acento ....... colores de marca
--      texto_barra_superior ................ aviso de la barra superior del encabezado
--      texto_whatsapp ...................... etiqueta del WhatsApp de Secretaría (barra superior)
--      enlace_como_llegar .................. enlace de Google Maps (Contacto y Comunidades)
--      enlace_messenger / texto_messenger .. enlace y texto del contacto por Messenger
--      descripcion_pie, texto_copyright,
--      texto_creditos ...................... textos del pie de página
INSERT INTO sede (tipo_sede_id, sede_padre_id, nombre, slug, direccion, telefono, whatsapp, correo, latitud, longitud, url_imagen_portada, configuracion) VALUES
  (1, NULL, 'Parroquia Señor de la Exaltación', 'senor-de-la-exaltacion',
   'Av. Héctor Ormachea N.º 167, Obrajes, La Paz', '(2) 278 4937', NULL,
   'parroquia.exaltacion.obrajes@gmail.com', -16.526795, -68.108216,
   '/media/seed/exterior-parroquia.webp',
   '{
      "color_primario": "#231F20",
      "color_acento": "#E2AD11",
      "texto_barra_superior": "Hoy, sábado: Santa Misa 7:00 · 18:00 (vespertina dominical)",
      "texto_whatsapp": "WhatsApp Secretaría",
      "enlace_como_llegar": "https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157",
      "enlace_messenger": "https://www.facebook.com/profile.php?id=100064836665037",
      "texto_messenger": "Escríbenos por Facebook Messenger",
      "descripcion_pie": "Parroquia confiada a la Congregación de la Pasión de Jesucristo (Pasionistas). Arquidiócesis de La Paz · Vicaría Sur.",
      "texto_copyright": "© 2026 Parroquia Señor de la Exaltación · Pasionistas Bolivia · pasionistas.org.bo",
      "texto_creditos": "Diseño y desarrollo: CodeForge · Ingeniería de Sistemas UCB"
    }'),
  (1, NULL, 'Parroquia de la Resurrección', 'resurreccion', 'La Paz', NULL, NULL, NULL, NULL, NULL, NULL, '{}'),
  (2, 1, 'Capilla San Pablo de la Cruz', 'capilla-san-pablo-de-la-cruz', 'La Paz', NULL, NULL, NULL, NULL, NULL, NULL, '{}');

-- Catálogo de redes sociales (se conservan los ids; la landing solo usa Facebook, Instagram y YouTube).
INSERT INTO red_social (nombre, icono) VALUES ('Facebook', 'facebook'), ('Instagram', 'instagram'), ('YouTube', 'youtube'), ('TikTok', 'tiktok'), ('WhatsApp', 'chat');

-- Redes de la sede principal, con los mismos enlaces del Encabezado y el PiePagina de la landing.
-- Nota: el enlace de YouTube de la landing es el canal de la Arquidiócesis de La Paz.
INSERT INTO sede_red_social (sede_id, red_social_id, url) VALUES
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM red_social WHERE nombre = 'Facebook'),  'https://www.facebook.com/profile.php?id=100064836665037'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM red_social WHERE nombre = 'Instagram'), 'https://www.instagram.com/senor_de_la_exaltacion'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM red_social WHERE nombre = 'YouTube'),   'https://www.youtube.com/@ArquidiocesisdeLaPaz/videos');

INSERT INTO rol (nombre, descripcion) VALUES
  ('Administrador', 'Equipo técnico CodeForge / soporte'),
  ('Párroco', 'Valida y define contenido pastoral'),
  ('Secretaría', 'Gestiona avisos, calendario, horarios y consultas del bot'),
  ('Marketing', 'Publica noticias, multimedia y contenido de difusión');

-- Usuarios de DESARROLLO, uno por rol (ids: 1 Administrador, 2 Párroco, 3 Secretaría, 4 Marketing).
-- Contraseña de desarrollo de los 4: Parroquia2026!
-- SOLO PARA DESARROLLO Y PRUEBAS: nunca usar este seed ni esta contraseña en producción.
-- Los hashes son argon2id reales (generados con el paquete argon2 del backend, cada uno con su sal).
INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena) VALUES
  (1, 1, 'Administrador (desarrollo)', 'admin@parroquia.test', '$argon2id$v=19$m=65536,t=3,p=4$c3E6g1XexEgEjO0MBKo/HQ$rXnD45VqH6BWmFs96H0bO/1UG7406t/KeHhKONHLOcM'),
  (2, 1, 'Párroco (desarrollo)', 'parroco@parroquia.test', '$argon2id$v=19$m=65536,t=3,p=4$rDoYvvp0j2r4WYm11omzFA$6MZZBUQoRkZjwX+XK+pzhwvCIzvMnkQF65IVKwQ49Qw'),
  (3, 1, 'Secretaría (desarrollo)', 'secretaria@parroquia.test', '$argon2id$v=19$m=65536,t=3,p=4$3M6EreOMkGDbZ7q4zCcefw$JfEdUYAEZpBMdfmJ6vcsxmZ/+pmymYNsOACHEc3omkc'),
  (4, 1, 'Marketing (desarrollo)', 'marketing@parroquia.test', '$argon2id$v=19$m=65536,t=3,p=4$KXR0/bT37XF2vo2a9DLnoQ$tt+Gq/4BlTZpury+FYB+11eoOvQ8YFbYL3xd976F+G4');

-- Estados de publicación (ids: 1 Borrador, 2 Publicado, 3 Archivado, 4 En revisión).
-- "En revisión" va al final para no alterar los ids existentes: es el estado en que
-- queda lo redactado por Marketing hasta que el Párroco lo aprueba o lo rechaza.
INSERT INTO estado_publicacion (nombre) VALUES ('Borrador'), ('Publicado'), ('Archivado'), ('En revisión');

-- Archivos multimedia actuales de la landing (frontend/src/assets/parroquia/). La url es relativa y
-- apunta a /media/seed/<archivo> (la Sección B los moverá a frontend/public/media/seed/).
-- tamano_bytes, ancho_px y alto_px son los valores reales de cada archivo (leídos con fs y sharp;
-- el ancho y alto del video salen de la cabecera del MP4). Subidos por el Administrador (desarrollo).
-- "pastoral-familiar.jpg" es el nombre nuevo del archivo "pastoral familiar.jpg".
-- No se registran los logos SVG: son parte del diseño (Encabezado y PiePagina), no contenido editable.
INSERT INTO archivo_multimedia (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo) VALUES
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'exterior-parroquia.webp', '/media/seed/exterior-parroquia.webp', 'image/webp', 243828, 1878, 1057,
   'Vista exterior de la Parroquia Señor de la Exaltación'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'crucifijo.webp', '/media/seed/crucifijo.webp', 'image/webp', 110004, 1888, 1059,
   'Crucifijo en el interior del templo parroquial'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'altar.webp', '/media/seed/altar.webp', 'image/webp', 176770, 1879, 1057,
   'Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'padre_gregorio.jpg', '/media/seed/padre_gregorio.jpg', 'image/jpeg', 194874, 1366, 2048,
   'P. Gregorio, C.P., párroco'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'pastoral-familiar.jpg', '/media/seed/pastoral-familiar.jpg', 'image/jpeg', 185283, 1137, 1383,
   'Afiche del encuentro de Pastoral Familiar sobre el duelo y la pérdida de un ser querido'),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'),
   'portada-final.mp4', '/media/seed/portada-final.mp4', 'video/mp4', 58916372, 1920, 1080,
   'Video institucional: recorrido por el templo de la Parroquia Señor de la Exaltación');

INSERT INTO tipo_bloque (codigo, nombre, esquema_validacion) VALUES
  ('hero_video', 'Portada con video', '{"type": "object", "required": ["titulo", "url_video"], "properties": {"titulo": {"type": "string"}, "subtitulo": {"type": "string"}, "url_video": {"type": "string"}, "url_poster": {"type": "string"}, "botones": {"type": "array"}}}'),
  ('texto_imagen', 'Texto con imagen', '{"type": "object", "required": ["titulo", "texto"], "properties": {"titulo": {"type": "string"}, "texto": {"type": "string"}, "url_imagen": {"type": "string"}, "posicion_imagen": {"enum": ["izquierda", "derecha"]}}}'),
  ('tarjetas', 'Grilla de tarjetas', '{"type": "object", "required": ["items"], "properties": {"titulo": {"type": "string"}, "items": {"type": "array"}}}'),
  ('cita', 'Cita destacada', '{"type": "object", "required": ["texto"], "properties": {"texto": {"type": "string"}, "autor": {"type": "string"}}}'),
  ('galeria', 'Galería de fotos', '{"type": "object", "required": ["imagenes"], "properties": {"imagenes": {"type": "array"}}}'),
  ('video_youtube', 'Video de YouTube', '{"type": "object", "required": ["youtube_video_id"], "properties": {"youtube_video_id": {"type": "string"}}}');

-- Páginas editables de la sede principal (publicadas, creadas por el Administrador de desarrollo).
INSERT INTO pagina (sede_id, estado_publicacion_id, creado_por, slug, titulo, mostrar_en_menu, orden_menu) VALUES
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
   (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'), 'inicio', 'Inicio', false, 0),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
   (SELECT id FROM usuario WHERE correo = 'admin@parroquia.test'), 'nosotros', 'Quiénes somos', true, 1);

-- Bloques de la página "inicio" (portada de la landing: Portada.jsx). La página y el tipo se buscan por slug y código.
-- Los bloques cumplen el esquema_validacion de su tipo y, además, llevan claves propias de la landing
-- (etiqueta, texto_video, detalle_video), que el esquema permite porque no restringe propiedades adicionales.
--  1) hero_video: título, subtítulo, video y póster (archivos de /media/seed/) y los dos botones de la portada.
--  2) tarjetas: los 4 accesos rápidos bajo la portada, con su ícono de lucide-react en kebab-case.
INSERT INTO bloque (pagina_id, tipo_bloque_id, orden, contenido) VALUES
  ((SELECT id FROM pagina WHERE slug = 'inicio' AND sede_id = (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion')),
   (SELECT id FROM tipo_bloque WHERE codigo = 'hero_video'), 1,
   '{
      "etiqueta": "Parroquia Pasionista · Obrajes, La Paz",
      "titulo": "Señor de la Exaltación",
      "subtitulo": "Una comunidad que camina junto a Cristo crucificado y resucitado. Te esperamos en casa, con las puertas siempre abiertas.",
      "url_video": "/media/seed/portada-final.mp4",
      "url_poster": "/media/seed/exterior-parroquia.webp",
      "texto_video": "Video institucional",
      "detalle_video": "Recorrido aéreo · 0:30",
      "botones": [
        {"texto": "Ver horarios de misa", "enlace": "#horarios"},
        {"texto": "Conócenos", "enlace": "#nosotros"}
      ]
    }'),
  ((SELECT id FROM pagina WHERE slug = 'inicio' AND sede_id = (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion')),
   (SELECT id FROM tipo_bloque WHERE codigo = 'tarjetas'), 2,
   '{
      "items": [
        {"titulo": "Horarios de Misa", "subtitulo": "Toda la semana",         "icono": "clock-3",       "enlace": "#horarios"},
        {"titulo": "Sacramentos",      "subtitulo": "Requisitos y fechas",    "icono": "droplet",       "enlace": "#sacramentos"},
        {"titulo": "Calendario",       "subtitulo": "Próximas actividades",   "icono": "calendar-days", "enlace": "#agenda"},
        {"titulo": "Proclamas",        "subtitulo": "Vigentes esta semana",   "icono": "scroll-text",   "enlace": "#proclamas"}
      ]
    }');

-- Bloques de la página "nosotros" (Nosotros.jsx), en el orden de la landing:
--  1) texto_imagen: título, descripción y foto del crucifijo (a la izquierda), con la tarjeta de la
--     Congregación como clave propia ("tarjeta").
--  2) cita: el lema de la Congregación Pasionista.
--  3) tarjetas: el párroco (nombre, cargo y foto).
-- El botón "Conoce nuestra historia" no se migra: en la landing es solo un control visual sin destino.
INSERT INTO bloque (pagina_id, tipo_bloque_id, orden, contenido) VALUES
  ((SELECT id FROM pagina WHERE slug = 'nosotros' AND sede_id = (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion')),
   (SELECT id FROM tipo_bloque WHERE codigo = 'texto_imagen'), 1,
   '{
      "etiqueta": "Quiénes somos",
      "titulo": "Una casa de oración en el corazón de Obrajes",
      "texto": "Somos una comunidad parroquial confiada a los Padres Pasionistas, que desde la memoria de la Pasión de Cristo acompaña a las familias de Obrajes en la fe, los sacramentos y el servicio a los más necesitados.",
      "url_imagen": "/media/seed/crucifijo.webp",
      "posicion_imagen": "izquierda",
      "tarjeta": {
        "etiqueta": "Congregación de la Pasión",
        "titulo": "Pasionistas · C.P.",
        "descripcion": "Fundada por San Pablo de la Cruz"
      }
    }'),
  ((SELECT id FROM pagina WHERE slug = 'nosotros' AND sede_id = (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion')),
   (SELECT id FROM tipo_bloque WHERE codigo = 'cita'), 2,
   '{
      "texto": "Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.",
      "autor": "Lema de la Congregación Pasionista"
    }'),
  ((SELECT id FROM pagina WHERE slug = 'nosotros' AND sede_id = (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion')),
   (SELECT id FROM tipo_bloque WHERE codigo = 'tarjetas'), 3,
   '{
      "items": [
        {"titulo": "P. Gregorio, C.P.", "subtitulo": "Párroco", "url_imagen": "/media/seed/padre_gregorio.jpg"}
      ]
    }');

INSERT INTO tipo_publicacion (nombre) VALUES ('Noticia'), ('Aviso'), ('Nota de prensa');
-- Categorías de publicaciones. "Pastoral Familiar" se agrega al final (id 4) para
-- no alterar los ids existentes.
INSERT INTO categoria (nombre, slug) VALUES ('Sacramentos', 'sacramentos'), ('Comunidad', 'comunidad'), ('Pasionistas', 'pasionistas'), ('Pastoral Familiar', 'pastoral-familiar');
INSERT INTO categoria_evento (nombre, color_hex) VALUES ('Liturgia', '#E2AD11'), ('Solemnidad', '#9E1B22'), ('Catequesis', '#B5532F'), ('Comunidad', '#3E9C97');
INSERT INTO tipo_horario (nombre) VALUES ('Santa Misa'), ('Confesiones'), ('Adoración'), ('Secretaría');

-- Horarios regulares de la sede principal, tal como aparecen en la tarjeta "Horarios" de la landing.
-- dia_semana: 1 = lunes ... 7 = domingo. La sede y el tipo se buscan por slug y nombre.
-- Total: 16 de Santa Misa + 6 de Confesiones + 1 de Adoración + 11 de Secretaría = 34 filas.

-- Santa Misa, lunes a viernes: 7:00 y 19:00.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_horario WHERE nombre = 'Santa Misa'),
       d.dia, h.hora::time, NULL, NULL
FROM generate_series(1, 5) AS d(dia), (VALUES ('07:00'), ('19:00')) AS h(hora);

-- Santa Misa, sábado: 7:00 y 18:00 (esta última es la misa vespertina dominical, marcada con * en la landing).
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_horario WHERE nombre = 'Santa Misa'),
       6, h.hora::time, NULL, h.descripcion::varchar
FROM (VALUES ('07:00', NULL), ('18:00', 'Misa vespertina dominical')) AS h(hora, descripcion);

-- Santa Misa, domingo: 8:00, 10:00, 12:00 y 19:00.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_horario WHERE nombre = 'Santa Misa'),
       7, h.hora::time, NULL, NULL
FROM (VALUES ('08:00'), ('10:00'), ('12:00'), ('19:00')) AS h(hora);

-- Confesiones: lunes a viernes de 18:00 a 18:45 y sábado de 10:00 a 12:00.
-- La nota de la landing ("Previo a cada misa, según disponibilidad") va en la descripción.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_horario WHERE nombre = 'Confesiones'),
       h.dia, h.inicio::time, h.fin::time, 'Previo a cada misa, según disponibilidad'
FROM (VALUES (1, '18:00', '18:45'), (2, '18:00', '18:45'), (3, '18:00', '18:45'),
             (4, '18:00', '18:45'), (5, '18:00', '18:45'), (6, '10:00', '12:00')) AS h(dia, inicio, fin);

-- Adoración: jueves de 19:30 a 20:30.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
VALUES ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
        (SELECT id FROM tipo_horario WHERE nombre = 'Adoración'),
        4, '19:30', '20:30', NULL);

-- Secretaría parroquial, lunes a viernes: 9:00-12:00 y 15:00-19:30.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_horario WHERE nombre = 'Secretaría'),
       d.dia, h.inicio::time, h.fin::time, NULL
FROM generate_series(1, 5) AS d(dia), (VALUES ('09:00', '12:00'), ('15:00', '19:30')) AS h(inicio, fin);

-- Secretaría parroquial, sábado: 9:00-12:00.
INSERT INTO horario (sede_id, tipo_horario_id, dia_semana, hora_inicio, hora_fin, descripcion)
VALUES ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
        (SELECT id FROM tipo_horario WHERE nombre = 'Secretaría'),
        6, '09:00', '12:00', NULL);

-- Textos de la sección de horarios que no tienen columna propia: se guardan en sede.configuracion.
--   horarios_introduccion ........ párrafo de introducción de la sección
--   horarios_notas ............... nota al pie de cada tarjeta (confesiones_adoracion y secretaria)
--   horarios_whatsapp_secretaria . fila "WhatsApp" de la tarjeta de Secretaría (no es un horario)
UPDATE sede
SET configuracion = configuracion || jsonb_build_object(
      'horarios_introduccion', 'Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.',
      'horarios_notas', jsonb_build_object(
          'confesiones_adoracion', 'Previo a cada misa, según disponibilidad',
          'secretaria', 'Trámites, certificados e inscripciones'),
      'horarios_whatsapp_secretaria', 'Asistente 24/7')
WHERE slug = 'senor-de-la-exaltacion';

-- Eventos de la agenda (4, los de la landing). Las fechas son RELATIVAS a la fecha de carga del seed
-- (current_date + N días) para que la agenda nunca quede vacía; los desfases N conservan la separación
-- entre eventos que tiene la landing. La hora se interpreta en la zona horaria de La Paz.
-- Los crea Secretaría y se publican directo (estado Publicado).
-- Los títulos no mencionan fechas propias, porque los eventos caen en días relativos a la carga.
-- "Misa de sanación" tiene tres horarios (8:00 – 10:00 – 12:00): inicia a las 8:00 y los
-- horarios completos van en la descripción.
INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, titulo, descripcion, lugar, fecha_inicio)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM categoria_evento WHERE nombre = e.categoria),
       (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
       (SELECT id FROM usuario WHERE correo = 'secretaria@parroquia.test'),
       e.titulo, e.descripcion, e.lugar,
       (current_date + e.dias + e.hora::time) AT TIME ZONE 'America/La_Paz'
FROM (VALUES
  ('Liturgia',   'Adoración eucarística comunitaria',                   NULL,                              'Templo parroquial', 6,  '19:00'),
  ('Solemnidad', 'Misa de sanación',                                    'Horarios: 8:00 – 10:00 – 12:00',  'Templo parroquial', 7,  '08:00'),
  ('Liturgia',   'Misa por los difuntos de la comunidad',               NULL,                              'Templo parroquial', 8,  '19:00'),
  ('Catequesis', 'Charla pre-bautismal para padres y padrinos',         NULL,                              'Salón parroquial',  13, '09:30')
) AS e(categoria, titulo, descripcion, lugar, dias, hora);

-- Avisos parroquiales (3, los de la landing): publicaciones de tipo Aviso creadas por Secretaría y
-- publicadas directo. La landing solo muestra una fecha y un texto, así que el texto va como título y
-- como único párrafo del contenido (formato BlockNote). Las fechas son recientes y relativas
-- (hace 1, 3 y 5 días, igual que 24, 22 y 20 de octubre respecto a la landing).
INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, contenido, fecha_publicacion)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_publicacion WHERE nombre = 'Aviso'),
       (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
       (SELECT id FROM usuario WHERE correo = 'secretaria@parroquia.test'),
       a.texto, a.slug,
       jsonb_build_object(
         'formato', 'blocknote',
         'version', 1,
         'bloques', jsonb_build_array(jsonb_build_object(
           'id', a.slug || '-p1',
           'type', 'paragraph',
           'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
           'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', a.texto, 'styles', jsonb_build_object())),
           'children', jsonb_build_array()))),
       now() - a.antiguedad
FROM (VALUES
  ('inscripciones-confirmacion-2027',   'Inscripciones abiertas para la catequesis de Confirmación 2027.',                  interval '1 day'),
  ('secretaria-atencion-lunes',         'El próximo lunes la secretaría atenderá solo por la mañana.',                      interval '3 days'),
  ('donaciones-viveres-pastoral-social','Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.',        interval '5 days')
) AS a(slug, texto, antiguedad);

-- Noticias de "Vida parroquial" (3, las de la landing), en su orden. Son publicaciones de tipo Noticia,
-- redactadas por Marketing y ya aprobadas por el Párroco (estado Publicado, con revisado_por y
-- fecha_revision, que el CHECK exige juntos), para dejar a la vista el flujo de revisión.
--  * La fecha de la landing es la de publicación, a las 12:00 hora de La Paz (las noticias pueden ser pasadas).
--  * resumen: el texto de la tarjeta. contenido (BlockNote): la landing no tiene cuerpo más largo,
--    así que es un único párrafo con ese mismo texto (sin inventar contenido).
--  * La portada es el archivo multimedia que usa la landing (se busca por url).
--  * url_externa: solo la noticia de Pastoral Familiar enlaza a Facebook.
INSERT INTO publicacion (sede_id, tipo_publicacion_id, categoria_id, estado_publicacion_id, autor_id,
                         imagen_portada_id, titulo, slug, resumen, contenido, url_externa,
                         fecha_publicacion, revisado_por, fecha_revision)
SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'),
       (SELECT id FROM tipo_publicacion WHERE nombre = 'Noticia'),
       (SELECT id FROM categoria WHERE nombre = n.categoria),
       (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
       (SELECT id FROM usuario WHERE correo = 'marketing@parroquia.test'),
       (SELECT id FROM archivo_multimedia WHERE url = n.imagen),
       n.titulo, n.slug, n.resumen,
       jsonb_build_object(
         'formato', 'blocknote',
         'version', 1,
         'bloques', jsonb_build_array(jsonb_build_object(
           'id', n.slug || '-p1',
           'type', 'paragraph',
           'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
           'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', n.resumen, 'styles', jsonb_build_object())),
           'children', jsonb_build_array()))),
       n.url_externa,
       n.fecha::timestamp AT TIME ZONE 'America/La_Paz',
       (SELECT id FROM usuario WHERE correo = 'parroco@parroquia.test'),
       n.fecha::timestamp AT TIME ZONE 'America/La_Paz'
FROM (VALUES
  ('Sacramentos', '/media/seed/crucifijo.webp',
   'primeras-comuniones-42-ninos',
   'Primeras comuniones: 42 niños recibieron a Jesús',
   'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
   NULL, '2026-10-18 12:00'),
  ('Comunidad', '/media/seed/exterior-parroquia.webp',
   'encuentro-monaguillos-vicaria-sur',
   'Encuentro de monaguillos de la Vicaría Sur',
   'Más de 60 monaguillos compartieron una jornada de formación, juego y oración.',
   NULL, '2026-10-11 12:00'),
  ('Pastoral Familiar', '/media/seed/pastoral-familiar.jpg',
   'encuentro-pastoral-familiar-duelo',
   'Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia',
   'Un espacio para reflexionar sobre la pérdida de un ser querido y encontrar acompañamiento desde la fe. Viernes 30 de octubre a las 19:30, en el Salón San Gabriel.',
   'https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3', '2026-10-30 12:00')
) AS n(categoria, imagen, slug, titulo, resumen, url_externa, fecha);

-- Sacramentos y catequesis, en el mismo orden de la landing (el Bautismo conserva el id 1).
--  * descripcion_corta: el texto de la tarjeta, copiado tal cual de la landing.
--  * icono: nombre de lucide-react en kebab-case. Matrimonio queda en NULL porque la landing
--    dibuja un SVG propio de dos anillos (no hay ícono de lucide equivalente).
--  * contenido (JSONB): {"datos": [{"etiqueta": "...", "valor": "..."}]} con los datos concretos
--    que el texto de la tarjeta menciona, para la vista de "Ver requisitos".
--    No se agregan requisitos que la landing no diga.
INSERT INTO servicio (sede_id, slug, nombre, descripcion_corta, icono, contenido, orden) VALUES
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'bautismo', 'Bautismo',
   'Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.', 'droplet',
   '{"datos": [
      {"etiqueta": "Charla pre-bautismal", "valor": "Primer sábado de cada mes"},
      {"etiqueta": "Inscripción", "valor": "Padres y padrinos se inscriben en secretaría"}]}', 1),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'primera-comunion', 'Primera Comunión',
   'Catequesis de dos años para niños desde los 8 años. Inscripciones de febrero a marzo.', 'sun',
   '{"datos": [
      {"etiqueta": "Duración", "valor": "Catequesis de dos años"},
      {"etiqueta": "Edad", "valor": "Niños desde los 8 años"},
      {"etiqueta": "Inscripciones", "valor": "De febrero a marzo"}]}', 2),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'confirmacion', 'Confirmación',
   'Preparación para jóvenes desde los 15 años y adultos que deseen completar su iniciación.', 'flame',
   '{"datos": [
      {"etiqueta": "Jóvenes", "valor": "Desde los 15 años"},
      {"etiqueta": "Adultos", "valor": "Quienes deseen completar su iniciación cristiana"}]}', 3),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'matrimonio', 'Matrimonio',
   'Cursillo prematrimonial, presentación de documentos y proclamas con tres meses de anticipación.', NULL,
   '{"datos": [
      {"etiqueta": "Preparación", "valor": "Cursillo prematrimonial"},
      {"etiqueta": "Documentos", "valor": "Presentación de documentos"},
      {"etiqueta": "Proclamas", "valor": "Con tres meses de anticipación"}]}', 4),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'catequesis-de-adultos', 'Catequesis de adultos',
   'Formación para adultos que desean recibir los sacramentos o profundizar su fe.', 'book-open',
   '{"datos": [
      {"etiqueta": "Dirigida a", "valor": "Adultos que desean recibir los sacramentos o profundizar su fe"}]}', 5),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'uncion-de-los-enfermos', 'Unción de los enfermos',
   'Visita a enfermos y adultos mayores en domicilio. Coordinar por teléfono o WhatsApp.', 'heart-pulse',
   '{"datos": [
      {"etiqueta": "Modalidad", "valor": "Visita a enfermos y adultos mayores en domicilio"},
      {"etiqueta": "Coordinación", "valor": "Por teléfono o WhatsApp"}]}', 6);

-- Grupos pastorales, en el orden de la landing. La landing solo muestra nombre, una línea
-- de horario o detalle (se guarda en horario_reunion tal cual) y un ícono de lucide-react.
-- descripcion, contacto e imagen quedan vacíos porque la landing no los tiene.
INSERT INTO grupo_pastoral (sede_id, nombre, horario_reunion, icono, orden) VALUES
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Monaguillos',      'Sábados · 10:00',     'star',            1),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Coro parroquial',  'Jueves · 19:00',      'music-2',         2),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Catequistas',      'Formación mensual',   'book-open',       3),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Pastoral Juvenil', 'Viernes · 18:30',     'users',           4),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Legión de María',  'Martes · 16:00',      'cross',           5),
  ((SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), 'Pastoral social',  'Cáritas parroquial',  'heart-handshake', 6);

INSERT INTO pregunta_frecuente (sede_id, servicio_id, pregunta, respuesta) VALUES
  (1, 1, '¿Qué requisitos necesito para bautizar a mi hijo?', 'Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes.');

-- Proclamas matrimoniales (3 parejas, las de la landing; nombres ficticios, como indica la propia landing).
-- Ya no requieren trámite de origen (tramite_origen_id = NULL). Las fechas son RELATIVAS:
--  * La boda cae en sábado, como en la landing: el primer sábado que queda al menos a 7 días de hoy,
--    y las otras dos 1 y 3 semanas después (14, 21 de noviembre y 5 de diciembre en la landing).
--  * Las proclamas se publican una por semana y la más reciente sale hoy. La pareja en "3.ª proclama"
--    tiene 3 publicaciones (hace 14 días, hace 7 días y hoy), la de "2.ª" tiene 2 (hace 7 días y hoy)
--    y la de "1.ª" tiene 1 (hoy).
WITH nuevas AS (
  INSERT INTO proclama (sede_id, tramite_origen_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
  SELECT (SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion'), NULL,
         p.contrayente_1, p.contrayente_2,
         (current_date + ((6 - extract(isodow FROM current_date)::int + 7) % 7) + 7 + p.dias_despues + p.hora::time)
           AT TIME ZONE 'America/La_Paz'
  FROM (VALUES
    ('Juan Carlos M. Q.',  'María Fernanda R. V.', 0,  '11:00'),
    ('Diego A. Choque L.', 'Camila S. Paredes',    7,  '16:00'),
    ('Luis F. Gutiérrez',  'Andrea Mamani C.',     21, '12:00')
  ) AS p(contrayente_1, contrayente_2, dias_despues, hora)
  RETURNING id, nombre_contrayente_1
)
INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion)
SELECT n.id, pp.numero, current_date - pp.hace_dias
FROM nuevas n
JOIN (VALUES
  ('Juan Carlos M. Q.',  1, 14), ('Juan Carlos M. Q.',  2, 7), ('Juan Carlos M. Q.',  3, 0),
  ('Diego A. Choque L.', 1, 7),  ('Diego A. Choque L.', 2, 0),
  ('Luis F. Gutiérrez',  1, 0)
) AS pp(contrayente_1, numero, hace_dias) ON pp.contrayente_1 = n.nombre_contrayente_1;

COMMIT;
