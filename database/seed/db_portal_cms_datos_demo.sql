-- Datos de DEMOSTRACIÓN para db_portal_cms: agenda, noticias, avisos, proclamas, páginas de grupos y
-- sacramentos, y un usuario Coordinador de grupo. Sirven para presentar el sistema sin secciones vacías.
--
--   * NO son datos reales de la parroquia y NO deben cargarse en producción: los textos son de ejemplo
--     y la parroquia los reemplaza desde el panel.
--   * Requiere el esquema, todas las migraciones y db_portal_cms_datos_iniciales.sql.
--   * Se puede ejecutar más de una vez: cada bloque comprueba si sus datos ya existen.
--   * Las fechas son RELATIVAS al día de carga (current_date + N días) para que la agenda nunca quede vacía;
--     las fiestas litúrgicas caen en su fecha real (la próxima que venga).
--   * Las imágenes se buscan por su texto alternativo, así funciona tanto con /media/seed/ como con el
--     bucket de OCI (después de npm run publicar-medios-seed).
--
-- Uso (desde la raíz del repositorio, con el contenedor levantado):
--   docker exec -i parroquia-postgres psql -v ON_ERROR_STOP=1 -U parroquia -d db_portal_cms < database/seed/db_portal_cms_datos_demo.sql
BEGIN;

-- ---- Funciones auxiliares (solo viven durante esta sesión) ----

-- Documento BlockNote a partir de líneas de texto: "## " = título, "- " = viñeta, resto = párrafo.
CREATE FUNCTION pg_temp.doc(prefijo text, lineas text[]) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('formato', 'blocknote', 'version', 1, 'bloques', coalesce(jsonb_agg(
    CASE
      WHEN l.linea LIKE '## %' THEN jsonb_build_object(
        'id', prefijo || '-' || l.n, 'type', 'heading',
        'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left', 'level', 2),
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', substr(l.linea, 4), 'styles', jsonb_build_object())),
        'children', jsonb_build_array())
      WHEN l.linea LIKE '- %' THEN jsonb_build_object(
        'id', prefijo || '-' || l.n, 'type', 'bulletListItem',
        'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', substr(l.linea, 3), 'styles', jsonb_build_object())),
        'children', jsonb_build_array())
      ELSE jsonb_build_object(
        'id', prefijo || '-' || l.n, 'type', 'paragraph',
        'props', jsonb_build_object('textColor', 'default', 'backgroundColor', 'default', 'textAlignment', 'left'),
        'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', l.linea, 'styles', jsonb_build_object())),
        'children', jsonb_build_array())
    END ORDER BY l.n), '[]'::jsonb))
  FROM unnest(lineas) WITH ORDINALITY AS l(linea, n);
$$;

-- Imagen por su texto alternativo (NULL si no está cargada).
CREATE FUNCTION pg_temp.img(patron text) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT id FROM archivo_multimedia WHERE texto_alternativo ILIKE patron ORDER BY id LIMIT 1;
$$;

-- Próxima ocurrencia (hoy o después) de un día del año, a una hora de La Paz.
CREATE FUNCTION pg_temp.proxima(mes int, dia int, hora text) RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((CASE WHEN make_date(extract(year FROM current_date)::int, mes, dia) >= current_date
                THEN make_date(extract(year FROM current_date)::int, mes, dia)
                ELSE make_date(extract(year FROM current_date)::int + 1, mes, dia) END) + hora::time)
         AT TIME ZONE 'America/La_Paz';
$$;

-- Primer domingo de Adviento (el domingo entre el 27 de noviembre y el 3 de diciembre), el próximo que venga.
CREATE FUNCTION pg_temp.adviento(hora text) RETURNS timestamptz LANGUAGE sql STABLE AS $$
  WITH c AS (
    SELECT make_date(a, 12, 3) - (extract(isodow FROM make_date(a, 12, 3))::int % 7) AS d
    FROM (VALUES (extract(year FROM current_date)::int), (extract(year FROM current_date)::int + 1)) AS y(a)
  )
  SELECT (min(d) + hora::time) AT TIME ZONE 'America/La_Paz' FROM c WHERE d >= current_date;
$$;

CREATE FUNCTION pg_temp.sede() RETURNS int LANGUAGE sql STABLE AS $$
  SELECT id FROM sede WHERE slug = 'senor-de-la-exaltacion';
$$;
CREATE FUNCTION pg_temp.usuario(correo_buscado text) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT id FROM usuario WHERE correo = correo_buscado;
$$;

-- ---- Coordinador de grupo (misma contraseña de desarrollo que los demás: Parroquia2026!) ----
-- El hash se copia del Administrador de desarrollo para no repetir la contraseña en el archivo.
INSERT INTO usuario (rol_id, sede_id, nombre_completo, correo, hash_contrasena)
SELECT (SELECT id FROM rol WHERE nombre = 'Coordinador de grupo'), pg_temp.sede(),
       'Coordinador de Pastoral Juvenil (desarrollo)', 'coordinador@parroquia.test', u.hash_contrasena
FROM usuario u
WHERE u.correo = 'admin@parroquia.test'
  AND NOT EXISTS (SELECT 1 FROM usuario WHERE correo = 'coordinador@parroquia.test');

INSERT INTO usuario_grupo_pastoral (usuario_id, grupo_pastoral_id)
SELECT pg_temp.usuario('coordinador@parroquia.test'), g.id
FROM grupo_pastoral g
WHERE g.sede_id = pg_temp.sede() AND g.slug = 'pastoral-juvenil'
ON CONFLICT DO NOTHING;

-- ---- Páginas de los grupos pastorales (solo los que todavía no tienen datos) ----
UPDATE grupo_pastoral g
SET descripcion = d.descripcion,
    responsable = d.responsable,
    correo      = d.correo,
    imagen_id   = coalesce(g.imagen_id, pg_temp.img(d.imagen)),
    detalle     = jsonb_build_object('contenido', pg_temp.doc('grupo-' || g.slug, d.lineas), 'galeria', jsonb_build_array())
FROM (VALUES
  ('monaguillos', 'Niños y adolescentes que sirven en el altar durante las celebraciones.',
   'Hno. Marcelo Quispe (ejemplo)', 'monaguillos@parroquia.test', 'Altar%',
   ARRAY['Los monaguillos ayudan al sacerdote en la misa y en las celebraciones especiales de la parroquia.',
         '## ¿Quiénes pueden participar?',
         '- Niños desde los 9 años que ya recibieron la Primera Comunión.',
         '- Adolescentes que quieran servir en la liturgia.',
         'Nos reunimos los sábados a las 10:00 en la sacristía para ensayar y formarnos.']),
  ('coro-parroquial', 'Voces e instrumentos que animan la misa dominical de las 10:00.',
   'Prof. Ana Lucía Torrez (ejemplo)', 'coro@parroquia.test', 'Crucifijo%',
   ARRAY['El coro parroquial anima la liturgia con cantos tradicionales y contemporáneos.',
         '## Ensayos',
         'Ensayamos los jueves a las 19:00 en el templo. No hace falta experiencia previa: solo ganas de cantar.',
         '- Voces: soprano, contralto, tenor y bajo.',
         '- Instrumentos: guitarra, teclado y charango.']),
  ('catequistas', 'Equipo que acompaña la preparación a la Primera Comunión y la Confirmación.',
   'Sra. Rosa Mamani (ejemplo)', 'catequesis@parroquia.test', 'Vista exterior%',
   ARRAY['Los catequistas preparan a niños, jóvenes y adultos para recibir los sacramentos.',
         'Cada mes tenemos una jornada de formación bíblica y pedagógica.',
         '## Únete al equipo',
         'Si ya estás confirmado y deseas compartir tu fe, acércate a la secretaría parroquial.']),
  ('pastoral-juvenil', 'Jóvenes de 15 a 30 años que comparten la fe, la amistad y el servicio.',
   'Coordinación juvenil (ejemplo)', 'juventud@parroquia.test', 'Vista exterior%',
   ARRAY['Somos un grupo de jóvenes que se reúne cada viernes para orar, compartir y servir a la comunidad.',
         '## Actividades',
         '- Encuentros semanales de oración y reflexión.',
         '- Retiros de Adviento y Cuaresma.',
         '- Voluntariado con la Pastoral social.',
         'Los viernes a las 18:30 en el Salón San Gabriel. ¡Te esperamos!']),
  ('legion-de-maria', 'Grupo de oración mariana y visita a enfermos del barrio.',
   'Sra. Teresa Choque (ejemplo)', 'legion@parroquia.test', 'Crucifijo%',
   ARRAY['La Legión de María reza el rosario y visita a los enfermos y adultos mayores de la zona.',
         'Nos reunimos los martes a las 16:00 en la capilla del Santísimo.']),
  ('pastoral-social', 'Cáritas parroquial: ayuda a las familias que más lo necesitan.',
   'Equipo de Cáritas (ejemplo)', 'caritas@parroquia.test', 'Vista exterior%',
   ARRAY['La Pastoral social recibe donaciones y las distribuye entre las familias de la parroquia.',
         '## ¿Cómo ayudar?',
         '- Víveres no perecederos: arroz, fideo, aceite, azúcar y leche.',
         '- Ropa de abrigo en buen estado.',
         '- Tu tiempo como voluntario en las jornadas de entrega.',
         'Recibimos donaciones en la secretaría parroquial de lunes a viernes.'])
) AS d(slug, descripcion, responsable, correo, imagen, lineas)
WHERE g.slug = d.slug AND g.sede_id = pg_temp.sede() AND g.detalle IS NULL;

-- ---- Páginas de los sacramentos (solo las que todavía no tienen contenido) ----
UPDATE servicio s
SET detalle   = jsonb_build_object('contenido', pg_temp.doc('servicio-' || s.slug, d.lineas), 'galeria', jsonb_build_array()),
    imagen_id = coalesce(s.imagen_id, pg_temp.img(d.imagen))
FROM (VALUES
  ('bautismo', 'Altar%', ARRAY[
    'El Bautismo es el primer sacramento de la vida cristiana: nos hace hijos de Dios y miembros de la Iglesia.',
    '## Requisitos (ejemplo)',
    '- Certificado de nacimiento del niño.',
    '- Cédula de identidad de los padres y de los padrinos.',
    '- Los padrinos deben estar confirmados.',
    '- Asistir a la charla pre-bautismal del primer sábado de cada mes.',
    'La inscripción se realiza en la secretaría parroquial con al menos dos semanas de anticipación.']),
  ('primera-comunion', 'Crucifijo%', ARRAY[
    'La Primera Comunión es el encuentro de los niños con Jesús en la Eucaristía.',
    '## Preparación',
    'La catequesis dura dos años y se realiza los sábados por la mañana. Los padres acompañan algunas sesiones.',
    '- Edad: desde los 8 años.',
    '- Inscripciones: de febrero a marzo en la secretaría.']),
  ('confirmacion', 'Crucifijo%', ARRAY[
    'En la Confirmación recibimos el don del Espíritu Santo para vivir y anunciar la fe.',
    '## ¿Quiénes pueden prepararse?',
    '- Jóvenes desde los 15 años.',
    '- Adultos que deseen completar su iniciación cristiana.',
    'La preparación dura un año e incluye un retiro espiritual.']),
  ('matrimonio', 'Vista exterior%', ARRAY[
    'El sacramento del Matrimonio une a los esposos en una alianza de amor para toda la vida.',
    '## Pasos (ejemplo)',
    '- Reservar la fecha en la secretaría con tres meses de anticipación.',
    '- Participar en el cursillo prematrimonial.',
    '- Presentar los documentos y publicar las proclamas matrimoniales.']),
  ('catequesis-de-adultos', 'Altar%', ARRAY[
    'Un espacio para adultos que desean recibir los sacramentos o profundizar su fe.',
    'Los encuentros son semanales, por la noche, y se adaptan a quienes trabajan.']),
  ('uncion-de-los-enfermos', 'Crucifijo%', ARRAY[
    'La Unción de los enfermos da fortaleza y paz a quienes atraviesan una enfermedad grave o la vejez.',
    'Coordina la visita del sacerdote por teléfono o WhatsApp con la secretaría parroquial.'])
) AS d(slug, imagen, lineas)
WHERE s.slug = d.slug AND s.sede_id = pg_temp.sede() AND s.detalle IS NULL;

-- ---- Agenda: eventos próximos, fiestas litúrgicas y dos ya realizados ----
INSERT INTO evento (sede_id, categoria_evento_id, estado_publicacion_id, creado_por, titulo, descripcion, lugar,
                    fecha_inicio, fecha_fin, todo_el_dia, imagen_id, detalle)
SELECT pg_temp.sede(),
       (SELECT id FROM categoria_evento WHERE nombre = e.categoria),
       (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
       pg_temp.usuario('secretaria@parroquia.test'),
       e.titulo, e.descripcion, e.lugar, e.inicio,
       CASE WHEN e.horas IS NULL THEN NULL ELSE e.inicio + make_interval(hours => e.horas) END,
       e.todo_el_dia, pg_temp.img(e.imagen), e.detalle
FROM (VALUES
  ('Liturgia',   'Hora santa por las vocaciones', 'Adoración y oración por las vocaciones sacerdotales y religiosas.', 'Templo parroquial',
   (current_date + 1 + time '19:00') AT TIME ZONE 'America/La_Paz', 1, false, NULL, NULL::jsonb),
  ('Comunidad',  'Encuentro de Pastoral Juvenil', 'Oración, dinámicas y preparación del retiro de Adviento.', 'Salón San Gabriel',
   (current_date + 2 + time '18:30') AT TIME ZONE 'America/La_Paz', 2, false, NULL, NULL),
  ('Catequesis', 'Catequesis de Primera Comunión', 'Encuentro semanal de los grupos de primer y segundo año.', 'Salón parroquial',
   (current_date + 3 + time '09:00') AT TIME ZONE 'America/La_Paz', 2, false, NULL, NULL),
  ('Comunidad',  'Visita a enfermos y adultos mayores', 'La Legión de María y el párroco visitan a los enfermos del barrio.', 'Zona de Obrajes',
   (current_date + 4 + time '10:00') AT TIME ZONE 'America/La_Paz', 3, false, NULL, NULL),
  ('Liturgia',   'Ensayo abierto del coro parroquial', 'Ensayo de los cantos de Navidad. Pueden sumarse nuevas voces.', 'Templo parroquial',
   (current_date + 5 + time '19:00') AT TIME ZONE 'America/La_Paz', 2, false, NULL, NULL),
  ('Catequesis', 'Charla para novios: preparación al matrimonio', 'Primera sesión del cursillo prematrimonial.', 'Salón San Gabriel',
   (current_date + 9 + time '19:30') AT TIME ZONE 'America/La_Paz', 2, false, 'Vista exterior%',
   jsonb_build_object(
     'contenido', pg_temp.doc('ev-novios', ARRAY[
       'Un espacio para que las parejas que se casarán en la parroquia reflexionen sobre la vida matrimonial (texto de ejemplo).',
       'Es requisito para celebrar el Matrimonio y se completa en cuatro sesiones.']),
     'direccion', 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
     'enlaceMapa', 'https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157',
     'programa', jsonb_build_array(
       jsonb_build_object('hora', '19:30', 'actividad', 'Bienvenida y oración'),
       jsonb_build_object('hora', '19:45', 'actividad', 'Charla: el sacramento del Matrimonio'),
       jsonb_build_object('hora', '21:00', 'actividad', 'Diálogo en parejas')),
     'responsable', jsonb_build_object('nombre', 'Pastoral Familiar (ejemplo)', 'rol', 'Coordinación', 'telefono', '(2) 278 4937'),
     'enlaces', jsonb_build_array())),
  ('Comunidad',  'Campaña de recolección de víveres', 'Cáritas parroquial recibe víveres no perecederos para las familias.', 'Atrio del templo',
   (current_date + 10 + time '08:00') AT TIME ZONE 'America/La_Paz', 6, false, NULL, NULL),
  ('Liturgia',   'Rosario con la Legión de María', 'Rezo comunitario del santo rosario.', 'Capilla del Santísimo',
   (current_date + 12 + time '16:00') AT TIME ZONE 'America/La_Paz', 1, false, NULL, NULL),
  ('Catequesis', 'Jornada de formación de catequistas', 'Jornada completa de formación bíblica y pedagógica.', 'Salón parroquial',
   (current_date + 15)::timestamp AT TIME ZONE 'America/La_Paz', NULL, true, NULL, NULL),
  ('Comunidad',  'Kermés parroquial a beneficio del templo', 'Comidas típicas, juegos para niños y música en vivo.', 'Atrio del templo',
   (current_date + 20 + time '11:00') AT TIME ZONE 'America/La_Paz', 6, false, 'Vista exterior%',
   jsonb_build_object(
     'contenido', pg_temp.doc('ev-kermes', ARRAY[
       'Lo recaudado se destina al mantenimiento del templo parroquial (texto de ejemplo).',
       'Cada grupo pastoral atiende un puesto. ¡Invita a tu familia!']),
     'direccion', 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
     'enlaceMapa', 'https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157',
     'programa', jsonb_build_array(
       jsonb_build_object('hora', '11:00', 'actividad', 'Apertura de puestos'),
       jsonb_build_object('hora', '13:00', 'actividad', 'Almuerzo comunitario'),
       jsonb_build_object('hora', '15:00', 'actividad', 'Juegos para niños y sorteo')),
     'responsable', jsonb_build_object('nombre', 'Consejo parroquial (ejemplo)', 'rol', 'Organización', 'telefono', '(2) 278 4937'),
     'enlaces', jsonb_build_array())),
  ('Catequesis', 'Charla pre-bautismal para padres y padrinos', 'Charla obligatoria para quienes bautizarán a sus hijos.', 'Salón parroquial',
   (current_date + 24 + time '09:30') AT TIME ZONE 'America/La_Paz', 2, false, NULL, NULL),
  ('Liturgia',   'Adoración eucarística nocturna', 'Turnos de adoración durante toda la noche.', 'Templo parroquial',
   (current_date + 27 + time '20:00') AT TIME ZONE 'America/La_Paz', 10, false, NULL, NULL),
  ('Comunidad',  'Jornada de limpieza y ornato del templo', 'Voluntarios de todos los grupos preparan el templo.', 'Templo parroquial',
   (current_date + 31 + time '09:00') AT TIME ZONE 'America/La_Paz', 4, false, NULL, NULL),
  ('Catequesis', 'Inicio del curso de Biblia para adultos', 'Primer encuentro del curso de lectura orante de la Biblia.', 'Salón San Gabriel',
   (current_date + 38 + time '19:30') AT TIME ZONE 'America/La_Paz', 2, false, NULL, NULL),
  ('Comunidad',  'Encuentro de familias de la parroquia', 'Tarde de convivencia para las familias de todos los grupos.', 'Salón parroquial',
   (current_date + 45 + time '15:00') AT TIME ZONE 'America/La_Paz', 3, false, NULL, NULL),
  ('Liturgia',   'Misa por los enfermos', 'Celebración con unción de los enfermos.', 'Templo parroquial',
   (current_date - 3 + time '19:00') AT TIME ZONE 'America/La_Paz', 1, false, NULL, NULL),
  ('Comunidad',  'Bendición de vehículos', 'Bendición de movilidades después de la misa dominical.', 'Atrio del templo',
   (current_date - 10 + time '11:00') AT TIME ZONE 'America/La_Paz', 1, false, NULL, NULL),
  -- Fiestas litúrgicas en su fecha real.
  ('Solemnidad', 'Primer domingo de Adviento', 'Bendición de las coronas de Adviento en todas las misas.', 'Templo parroquial',
   pg_temp.adviento('10:00'), 1, false, NULL, NULL),
  ('Solemnidad', 'Solemnidad de la Inmaculada Concepción', 'Misa solemne en honor a la Virgen María.', 'Templo parroquial',
   pg_temp.proxima(12, 8, '10:00'), 1, false, 'Altar%', NULL),
  ('Solemnidad', 'Misa de Nochebuena', 'Celebración de la Nochebuena con el coro parroquial.', 'Templo parroquial',
   pg_temp.proxima(12, 24, '22:00'), 2, false, 'Altar%',
   jsonb_build_object(
     'contenido', pg_temp.doc('ev-nochebuena', ARRAY[
       'Celebramos juntos el nacimiento de Jesús. El coro parroquial anima la misa con villancicos (texto de ejemplo).']),
     'direccion', 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
     'enlaceMapa', 'https://www.google.com/maps/search/?api=1&query=-16.5267952%2C-68.1082157',
     'programa', jsonb_build_array(
       jsonb_build_object('hora', '21:30', 'actividad', 'Villancicos con el coro'),
       jsonb_build_object('hora', '22:00', 'actividad', 'Santa Misa de Nochebuena')),
     'responsable', jsonb_build_object('nombre', 'Equipo de Liturgia (ejemplo)', 'rol', 'Coordinación pastoral', 'telefono', '(2) 278 4937'),
     'enlaces', jsonb_build_array())),
  ('Solemnidad', 'Navidad del Señor', 'Misas de Navidad a las 8:00, 10:00 y 19:00.', 'Templo parroquial',
   pg_temp.proxima(12, 25, '10:00'), 1, false, NULL, NULL),
  ('Liturgia',   'Misa de fin de año y acción de gracias', 'Damos gracias por el año que termina.', 'Templo parroquial',
   pg_temp.proxima(12, 31, '20:00'), 1, false, NULL, NULL),
  ('Solemnidad', 'Santa María, Madre de Dios', 'Misa de Año Nuevo y Jornada Mundial de la Paz.', 'Templo parroquial',
   pg_temp.proxima(1, 1, '10:00'), 1, false, NULL, NULL),
  ('Solemnidad', 'Epifanía del Señor', 'Celebración de los Reyes Magos con los niños de catequesis.', 'Templo parroquial',
   pg_temp.proxima(1, 6, '10:00'), 1, false, NULL, NULL),
  ('Solemnidad', 'Fiesta patronal: Exaltación de la Santa Cruz', 'Misa solemne, procesión y fiesta de toda la comunidad.', 'Templo parroquial',
   pg_temp.proxima(9, 14, '10:00'), 3, false, 'Crucifijo%', NULL)
) AS e(categoria, titulo, descripcion, lugar, inicio, horas, todo_el_dia, imagen, detalle)
WHERE NOT EXISTS (SELECT 1 FROM evento x WHERE x.sede_id = pg_temp.sede() AND x.titulo = e.titulo);

-- ---- Noticias publicadas (Marketing redacta, el Párroco aprueba), relacionadas con grupos y sacramentos ----
CREATE TEMP TABLE demo_noticia (
  slug text, titulo text, resumen text, categoria text, imagen text, hace_dias int,
  grupos text[], servicios text[], estado text, autor text, lineas text[]
) ON COMMIT DROP;

INSERT INTO demo_noticia VALUES
  ('pastoral-juvenil-prepara-retiro-adviento', 'Pastoral Juvenil prepara su retiro de Adviento',
   'Más de 30 jóvenes se preparan para vivir el Adviento con un fin de semana de oración y servicio.',
   'Comunidad', 'Vista exterior%', 2, ARRAY['pastoral-juvenil'], ARRAY[]::text[], 'Publicado', 'marketing@parroquia.test',
   ARRAY['Los jóvenes de la parroquia se reunieron para organizar su retiro de Adviento (texto de ejemplo).',
         'Habrá momentos de oración, talleres y una jornada de servicio con la Pastoral social.']),
  ('coro-estrena-repertorio-navidad', 'El coro parroquial estrena repertorio para Navidad',
   'Villancicos tradicionales bolivianos y nuevos cantos acompañarán las misas de diciembre.',
   'Comunidad', 'Crucifijo%', 4, ARRAY['coro-parroquial'], ARRAY[]::text[], 'Publicado', 'marketing@parroquia.test',
   ARRAY['El coro parroquial preparó un repertorio especial para el tiempo de Navidad (texto de ejemplo).',
         'Los ensayos abiertos son los jueves a las 19:00.']),
  ('caritas-entrego-canastas-familiares', 'Cáritas parroquial entregó 120 canastas familiares',
   'Gracias a las donaciones de la comunidad, 120 familias recibieron víveres para fin de mes.',
   'Comunidad', 'Vista exterior%', 6, ARRAY['pastoral-social'], ARRAY[]::text[], 'Publicado', 'marketing@parroquia.test',
   ARRAY['La Pastoral social agradece a todos los que donaron víveres durante la campaña (texto de ejemplo).',
         '- 120 canastas familiares entregadas.',
         '- 25 voluntarios de distintos grupos pastorales.']),
  ('nuevo-ciclo-charlas-prebautismales', 'Nuevo ciclo de charlas pre-bautismales',
   'Padres y padrinos pueden inscribirse en la secretaría para la charla del primer sábado del mes.',
   'Sacramentos', 'Altar%', 8, ARRAY[]::text[], ARRAY['bautismo'], 'Publicado', 'marketing@parroquia.test',
   ARRAY['La parroquia renovó el contenido de sus charlas pre-bautismales (texto de ejemplo).',
         'La inscripción se hace en la secretaría parroquial.']),
  ('catequistas-renuevan-compromiso', 'Los catequistas renuevan su compromiso',
   'En la misa dominical, 18 catequistas renovaron su compromiso de acompañar a los niños.',
   'Sacramentos', 'Crucifijo%', 12, ARRAY['catequistas'], ARRAY['primera-comunion'], 'Publicado', 'marketing@parroquia.test',
   ARRAY['Los catequistas recibieron la bendición del párroco para un nuevo año de catequesis (texto de ejemplo).']),
  ('bodas-de-plata-en-la-parroquia', 'Matrimonios celebran sus bodas de plata',
   'Diez parejas renovaron sus promesas matrimoniales en una misa especial.',
   'Pastoral Familiar', 'Altar%', 15, ARRAY[]::text[], ARRAY['matrimonio'], 'Publicado', 'marketing@parroquia.test',
   ARRAY['La Pastoral Familiar organizó una celebración para las parejas que cumplen 25 años de matrimonio (texto de ejemplo).']),
  ('legion-de-maria-visita-adultos-mayores', 'La Legión de María visita a los adultos mayores',
   'Las legionarias acompañaron con oración y la Unción de los enfermos a 15 adultos mayores.',
   'Comunidad', 'Crucifijo%', 20, ARRAY['legion-de-maria'], ARRAY['uncion-de-los-enfermos'], 'Publicado', 'marketing@parroquia.test',
   ARRAY['Junto al párroco, la Legión de María visitó a los adultos mayores del barrio (texto de ejemplo).']),
  ('confirmaciones-35-jovenes', 'Confirmaciones: 35 jóvenes recibieron el Espíritu Santo',
   'El obispo auxiliar presidió la celebración de las confirmaciones en la parroquia.',
   'Sacramentos', 'Crucifijo%', 25, ARRAY['pastoral-juvenil'], ARRAY['confirmacion'], 'Publicado', 'marketing@parroquia.test',
   ARRAY['Después de un año de preparación, 35 jóvenes recibieron el sacramento de la Confirmación (texto de ejemplo).']),
  -- Para mostrar el flujo de revisión en la exposición:
  ('campana-navidad-solidaria', 'Campaña de Navidad solidaria',
   'Marketing propone una campaña para reunir juguetes y víveres en diciembre.',
   'Comunidad', 'Vista exterior%', 0, ARRAY['pastoral-social'], ARRAY[]::text[], 'En revisión', 'marketing@parroquia.test',
   ARRAY['Borrador de la campaña de Navidad solidaria, a la espera de la aprobación del párroco (texto de ejemplo).']),
  ('galeria-fiesta-patronal', 'Galería de la fiesta patronal',
   'Fotos de la última fiesta patronal (borrador).',
   'Pasionistas', 'Altar%', 0, ARRAY[]::text[], ARRAY[]::text[], 'Borrador', 'marketing@parroquia.test',
   ARRAY['Borrador: falta agregar las fotos (texto de ejemplo).']),
  ('jovenes-jornada-diocesana-juventud', 'Jóvenes de la parroquia irán a la Jornada Diocesana de la Juventud',
   'Pastoral Juvenil organiza la participación de 20 jóvenes en la jornada diocesana.',
   'Comunidad', 'Vista exterior%', 0, ARRAY['pastoral-juvenil'], ARRAY[]::text[], 'En revisión', 'coordinador@parroquia.test',
   ARRAY['Noticia redactada por el coordinador del grupo y enviada a revisión del párroco (texto de ejemplo).']);

INSERT INTO publicacion (sede_id, tipo_publicacion_id, categoria_id, estado_publicacion_id, autor_id, imagen_portada_id,
                         titulo, slug, resumen, contenido, fecha_publicacion, revisado_por, fecha_revision)
SELECT pg_temp.sede(),
       (SELECT id FROM tipo_publicacion WHERE nombre = 'Noticia'),
       (SELECT id FROM categoria WHERE nombre = n.categoria),
       (SELECT id FROM estado_publicacion WHERE nombre = n.estado),
       pg_temp.usuario(n.autor),
       pg_temp.img(n.imagen),
       n.titulo, n.slug, n.resumen, pg_temp.doc(n.slug, n.lineas),
       CASE WHEN n.estado = 'Publicado' THEN (current_date - n.hace_dias + time '12:00') AT TIME ZONE 'America/La_Paz' END,
       CASE WHEN n.estado = 'Publicado' THEN pg_temp.usuario('parroco@parroquia.test') END,
       CASE WHEN n.estado = 'Publicado' THEN (current_date - n.hace_dias + time '12:00') AT TIME ZONE 'America/La_Paz' END
FROM demo_noticia n
WHERE pg_temp.usuario(n.autor) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM publicacion p WHERE p.sede_id = pg_temp.sede() AND p.slug = n.slug);

INSERT INTO publicacion_grupo_pastoral (publicacion_id, grupo_pastoral_id)
SELECT p.id, g.id
FROM demo_noticia n
JOIN publicacion p ON p.slug = n.slug AND p.sede_id = pg_temp.sede()
CROSS JOIN LATERAL unnest(n.grupos) AS gs(slug)
JOIN grupo_pastoral g ON g.slug = gs.slug AND g.sede_id = pg_temp.sede()
ON CONFLICT DO NOTHING;

INSERT INTO publicacion_servicio (publicacion_id, servicio_id)
SELECT p.id, s.id
FROM demo_noticia n
JOIN publicacion p ON p.slug = n.slug AND p.sede_id = pg_temp.sede()
CROSS JOIN LATERAL unnest(n.servicios) AS ss(slug)
JOIN servicio s ON s.slug = ss.slug AND s.sede_id = pg_temp.sede()
ON CONFLICT DO NOTHING;

-- ---- Avisos de Secretaría ----
INSERT INTO publicacion (sede_id, tipo_publicacion_id, estado_publicacion_id, autor_id, titulo, slug, contenido, fecha_publicacion)
SELECT pg_temp.sede(),
       (SELECT id FROM tipo_publicacion WHERE nombre = 'Aviso'),
       (SELECT id FROM estado_publicacion WHERE nombre = 'Publicado'),
       pg_temp.usuario('secretaria@parroquia.test'),
       a.texto, a.slug, pg_temp.doc(a.slug, ARRAY[a.texto]), now() - a.antiguedad
FROM (VALUES
  ('horario-especial-navidad', 'Las misas de Navidad y Año Nuevo tienen horario especial: revisa el calendario.', interval '0 days'),
  ('inscripciones-catequesis-primera-comunion', 'Inscripciones para la catequesis de Primera Comunión en la secretaría parroquial.', interval '2 days')
) AS a(slug, texto, antiguedad)
WHERE NOT EXISTS (SELECT 1 FROM publicacion p WHERE p.sede_id = pg_temp.sede() AND p.slug = a.slug);

-- ---- Proclamas matrimoniales (nombres ficticios) ----
WITH nuevas AS (
  INSERT INTO proclama (sede_id, tramite_origen_id, nombre_contrayente_1, nombre_contrayente_2, fecha_matrimonio)
  SELECT pg_temp.sede(), NULL, p.c1, p.c2,
         (current_date + ((6 - extract(isodow FROM current_date)::int + 7) % 7) + p.dias + p.hora::time) AT TIME ZONE 'America/La_Paz'
  FROM (VALUES
    ('Marco A. Villca T.',  'Gabriela P. Rojas',  28, '11:00'),
    ('Rodrigo E. Flores',   'Natalia C. Apaza',   35, '17:00')
  ) AS p(c1, c2, dias, hora)
  WHERE NOT EXISTS (SELECT 1 FROM proclama x WHERE x.nombre_contrayente_1 = p.c1)
  RETURNING id
)
INSERT INTO proclama_publicacion (proclama_id, numero_proclama, fecha_publicacion)
SELECT id, 1, current_date FROM nuevas;

COMMIT;
