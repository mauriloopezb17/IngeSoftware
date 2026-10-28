-- Created by Redgate Data Modeler
-- Last modification date: 2026-10-26 10:12:37.418
-- Model: db_portal_cms — Portal web y servidor CMS (PostgreSQL 16)

-- tables
-- Table: archivo_multimedia
CREATE TABLE archivo_multimedia (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    subido_por int  NOT NULL,
    nombre_original varchar(255)  NOT NULL,
    url varchar(500)  NOT NULL,
    tipo_mime varchar(100)  NOT NULL,
    tamano_bytes bigint  NOT NULL,
    ancho_px int  NULL,
    alto_px int  NULL,
    texto_alternativo varchar(255)  NULL,
    fecha_subida timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT archivo_multimedia_ak_1 UNIQUE (url) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT archivo_multimedia_tamano_ck CHECK (tamano_bytes > 0),
    CONSTRAINT archivo_multimedia_pk PRIMARY KEY (id)
);

-- Table: bitacora_cambio
CREATE TABLE bitacora_cambio (
    id bigserial  NOT NULL,
    usuario_id int  NULL,
    entidad varchar(60)  NOT NULL,
    entidad_id varchar(40)  NOT NULL,
    accion varchar(10)  NOT NULL,
    datos_anteriores jsonb  NULL,
    datos_nuevos jsonb  NULL,
    direccion_ip inet  NULL,
    fecha timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT bitacora_cambio_accion_ck CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    CONSTRAINT bitacora_cambio_pk PRIMARY KEY (id)
);

CREATE INDEX bitacora_cambio_idx_1 on bitacora_cambio (entidad ASC, entidad_id ASC);

-- Table: bloque
CREATE TABLE bloque (
    id serial  NOT NULL,
    pagina_id int  NOT NULL,
    tipo_bloque_id int  NOT NULL,
    orden smallint  NOT NULL,
    contenido jsonb  NOT NULL,
    visible boolean  NOT NULL DEFAULT true,
    fecha_actualizacion timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT bloque_pk PRIMARY KEY (id)
);

CREATE INDEX bloque_idx_1 on bloque (pagina_id ASC, orden ASC);

-- Table: boletin
CREATE TABLE boletin (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    archivo_id int  NOT NULL,
    publicado_por int  NOT NULL,
    titulo varchar(150)  NOT NULL,
    periodo date  NOT NULL,
    fecha_publicacion timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT boletin_ak_1 UNIQUE (sede_id, periodo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT boletin_pk PRIMARY KEY (id)
);

-- Table: categoria
CREATE TABLE categoria (
    id serial  NOT NULL,
    nombre varchar(60)  NOT NULL,
    slug varchar(60)  NOT NULL,
    CONSTRAINT categoria_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT categoria_ak_2 UNIQUE (slug) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT categoria_pk PRIMARY KEY (id)
);

-- Table: categoria_evento
CREATE TABLE categoria_evento (
    id serial  NOT NULL,
    nombre varchar(60)  NOT NULL,
    color_hex char(7)  NULL,
    CONSTRAINT categoria_evento_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT categoria_evento_pk PRIMARY KEY (id)
);

-- Table: conversacion_bot
CREATE TABLE conversacion_bot (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    atendida_por int  NULL,
    canal varchar(10)  NOT NULL,
    identificador_contacto varchar(120)  NOT NULL,
    nombre_contacto varchar(120)  NULL,
    fecha_inicio timestamptz  NOT NULL DEFAULT now(),
    requiere_atencion boolean  NOT NULL DEFAULT false,
    fecha_atencion timestamptz  NULL,
    CONSTRAINT conversacion_bot_canal_ck CHECK (canal IN ('WEB', 'WHATSAPP')),
    CONSTRAINT conversacion_bot_atencion_ck CHECK ((atendida_por IS NULL) = (fecha_atencion IS NULL)),
    CONSTRAINT conversacion_bot_pk PRIMARY KEY (id)
);

CREATE INDEX conversacion_bot_idx_1 on conversacion_bot (requiere_atencion ASC, fecha_inicio ASC);

-- Table: estado_publicacion
CREATE TABLE estado_publicacion (
    id serial  NOT NULL,
    nombre varchar(30)  NOT NULL,
    CONSTRAINT estado_publicacion_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT estado_publicacion_pk PRIMARY KEY (id)
);

-- Table: evento
CREATE TABLE evento (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    categoria_evento_id int  NOT NULL,
    estado_publicacion_id int  NOT NULL,
    creado_por int  NOT NULL,
    imagen_id int  NULL,
    titulo varchar(200)  NOT NULL,
    descripcion text  NULL,
    lugar varchar(150)  NULL,
    fecha_inicio timestamptz  NOT NULL,
    fecha_fin timestamptz  NULL,
    todo_el_dia boolean  NOT NULL DEFAULT false,
    id_externo_m365 varchar(255)  NULL,
    CONSTRAINT evento_ak_1 UNIQUE (id_externo_m365) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT evento_fechas_ck CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
    CONSTRAINT evento_pk PRIMARY KEY (id)
);

CREATE INDEX evento_idx_1 on evento (sede_id ASC, fecha_inicio ASC);

-- Table: grupo_pastoral
CREATE TABLE grupo_pastoral (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    imagen_id int  NULL,
    nombre varchar(100)  NOT NULL,
    descripcion text  NULL,
    horario_reunion varchar(100)  NULL,
    contacto varchar(120)  NULL,
    icono varchar(40)  NULL,
    orden smallint  NOT NULL DEFAULT 0,
    visible boolean  NOT NULL DEFAULT true,
    CONSTRAINT grupo_pastoral_pk PRIMARY KEY (id)
);

-- Table: horario
CREATE TABLE horario (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    tipo_horario_id int  NOT NULL,
    dia_semana smallint  NOT NULL,
    hora_inicio time  NOT NULL,
    hora_fin time  NULL,
    descripcion varchar(150)  NULL,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT horario_dia_semana_ck CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT horario_horas_ck CHECK (hora_fin IS NULL OR hora_fin > hora_inicio),
    CONSTRAINT horario_pk PRIMARY KEY (id)
);

CREATE INDEX horario_idx_1 on horario (sede_id ASC, dia_semana ASC);

-- Table: mensaje_bot
CREATE TABLE mensaje_bot (
    id bigserial  NOT NULL,
    conversacion_id int  NOT NULL,
    pregunta_frecuente_id int  NULL,
    emisor varchar(10)  NOT NULL,
    contenido text  NOT NULL,
    fecha_envio timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT mensaje_bot_emisor_ck CHECK (emisor IN ('USUARIO', 'BOT', 'SECRETARIA')),
    CONSTRAINT mensaje_bot_pk PRIMARY KEY (id)
);

CREATE INDEX mensaje_bot_idx_1 on mensaje_bot (conversacion_id ASC, fecha_envio ASC);

-- Table: pagina
CREATE TABLE pagina (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    pagina_padre_id int  NULL,
    estado_publicacion_id int  NOT NULL,
    creado_por int  NOT NULL,
    actualizado_por int  NULL,
    slug varchar(120)  NOT NULL,
    titulo varchar(160)  NOT NULL,
    descripcion_seo varchar(300)  NULL,
    mostrar_en_menu boolean  NOT NULL DEFAULT false,
    orden_menu smallint  NOT NULL DEFAULT 0,
    fecha_creacion timestamptz  NOT NULL DEFAULT now(),
    fecha_actualizacion timestamptz  NULL,
    CONSTRAINT pagina_ak_1 UNIQUE (sede_id, slug) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT pagina_pk PRIMARY KEY (id)
);

-- Table: pregunta_frecuente
CREATE TABLE pregunta_frecuente (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    servicio_id int  NULL,
    pregunta varchar(300)  NOT NULL,
    respuesta text  NOT NULL,
    orden smallint  NOT NULL DEFAULT 0,
    activa boolean  NOT NULL DEFAULT true,
    CONSTRAINT pregunta_frecuente_pk PRIMARY KEY (id)
);

-- Table: proclama
CREATE TABLE proclama (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    tramite_origen_id int  NOT NULL,
    nombre_contrayente_1 varchar(150)  NOT NULL,
    nombre_contrayente_2 varchar(150)  NOT NULL,
    fecha_matrimonio timestamptz  NOT NULL,
    fecha_registro timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT proclama_ak_1 UNIQUE (tramite_origen_id) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT proclama_pk PRIMARY KEY (id)
);

-- Table: proclama_publicacion
CREATE TABLE proclama_publicacion (
    proclama_id int  NOT NULL,
    numero_proclama smallint  NOT NULL,
    fecha_publicacion date  NOT NULL,
    CONSTRAINT proclama_publicacion_numero_ck CHECK (numero_proclama BETWEEN 1 AND 3),
    CONSTRAINT proclama_publicacion_pk PRIMARY KEY (proclama_id,numero_proclama)
);

-- Table: publicacion
CREATE TABLE publicacion (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    tipo_publicacion_id int  NOT NULL,
    categoria_id int  NULL,
    estado_publicacion_id int  NOT NULL,
    autor_id int  NOT NULL,
    imagen_portada_id int  NULL,
    titulo varchar(200)  NOT NULL,
    slug varchar(200)  NOT NULL,
    resumen varchar(400)  NULL,
    contenido jsonb  NOT NULL,
    url_externa varchar(500)  NULL,
    destacada boolean  NOT NULL DEFAULT false,
    fecha_publicacion timestamptz  NULL,
    fecha_expiracion timestamptz  NULL,
    fecha_creacion timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT publicacion_ak_1 UNIQUE (sede_id, slug) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT publicacion_fechas_ck CHECK (fecha_expiracion IS NULL OR fecha_expiracion > fecha_publicacion),
    CONSTRAINT publicacion_pk PRIMARY KEY (id)
);

CREATE INDEX publicacion_idx_1 on publicacion (sede_id ASC, fecha_publicacion DESC);

-- Table: red_social
CREATE TABLE red_social (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    icono varchar(40)  NOT NULL,
    CONSTRAINT red_social_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT red_social_pk PRIMARY KEY (id)
);

-- Table: rol
CREATE TABLE rol (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    descripcion varchar(200)  NULL,
    CONSTRAINT rol_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT rol_pk PRIMARY KEY (id)
);

-- Table: sede
CREATE TABLE sede (
    id serial  NOT NULL,
    tipo_sede_id int  NOT NULL,
    sede_padre_id int  NULL,
    nombre varchar(120)  NOT NULL,
    slug varchar(80)  NOT NULL,
    direccion varchar(200)  NULL,
    telefono varchar(30)  NULL,
    whatsapp varchar(30)  NULL,
    correo varchar(120)  NULL,
    latitud numeric(9,6)  NULL,
    longitud numeric(9,6)  NULL,
    url_imagen_portada varchar(500)  NULL,
    configuracion jsonb  NOT NULL DEFAULT '{}'::jsonb,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT sede_ak_1 UNIQUE (slug) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT sede_pk PRIMARY KEY (id)
);

-- Table: sede_red_social
CREATE TABLE sede_red_social (
    sede_id int  NOT NULL,
    red_social_id int  NOT NULL,
    url varchar(300)  NOT NULL,
    CONSTRAINT sede_red_social_pk PRIMARY KEY (sede_id,red_social_id)
);

-- Table: servicio
CREATE TABLE servicio (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    slug varchar(80)  NOT NULL,
    nombre varchar(100)  NOT NULL,
    descripcion_corta varchar(300)  NOT NULL,
    icono varchar(40)  NULL,
    contenido jsonb  NOT NULL,
    orden smallint  NOT NULL DEFAULT 0,
    visible boolean  NOT NULL DEFAULT true,
    CONSTRAINT servicio_ak_1 UNIQUE (sede_id, slug) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT servicio_pk PRIMARY KEY (id)
);

-- Table: tipo_bloque
CREATE TABLE tipo_bloque (
    id serial  NOT NULL,
    codigo varchar(40)  NOT NULL,
    nombre varchar(80)  NOT NULL,
    esquema_validacion jsonb  NOT NULL,
    CONSTRAINT tipo_bloque_ak_1 UNIQUE (codigo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_bloque_pk PRIMARY KEY (id)
);

-- Table: tipo_horario
CREATE TABLE tipo_horario (
    id serial  NOT NULL,
    nombre varchar(60)  NOT NULL,
    CONSTRAINT tipo_horario_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_horario_pk PRIMARY KEY (id)
);

-- Table: tipo_publicacion
CREATE TABLE tipo_publicacion (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT tipo_publicacion_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_publicacion_pk PRIMARY KEY (id)
);

-- Table: tipo_sede
CREATE TABLE tipo_sede (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT tipo_sede_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_sede_pk PRIMARY KEY (id)
);

-- Table: usuario
CREATE TABLE usuario (
    id serial  NOT NULL,
    rol_id int  NOT NULL,
    sede_id int  NULL,
    nombre_completo varchar(120)  NOT NULL,
    correo varchar(120)  NOT NULL,
    hash_contrasena varchar(255)  NOT NULL,
    activo boolean  NOT NULL DEFAULT true,
    fecha_ultimo_acceso timestamptz  NULL,
    fecha_creacion timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT usuario_ak_1 UNIQUE (correo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT usuario_pk PRIMARY KEY (id)
);

-- Table: video
CREATE TABLE video (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    titulo varchar(160)  NOT NULL,
    descripcion text  NULL,
    youtube_video_id varchar(20)  NOT NULL,
    duracion_segundos int  NULL,
    destacado boolean  NOT NULL DEFAULT false,
    orden smallint  NOT NULL DEFAULT 0,
    fecha_publicacion date  NULL,
    CONSTRAINT video_ak_1 UNIQUE (youtube_video_id) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT video_pk PRIMARY KEY (id)
);

-- foreign keys
-- Reference: archivo_multimedia_sede (table: archivo_multimedia)
ALTER TABLE archivo_multimedia ADD CONSTRAINT archivo_multimedia_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: archivo_multimedia_usuario (table: archivo_multimedia)
ALTER TABLE archivo_multimedia ADD CONSTRAINT archivo_multimedia_usuario
    FOREIGN KEY (subido_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: bitacora_cambio_usuario (table: bitacora_cambio)
ALTER TABLE bitacora_cambio ADD CONSTRAINT bitacora_cambio_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: bloque_pagina (table: bloque)
ALTER TABLE bloque ADD CONSTRAINT bloque_pagina
    FOREIGN KEY (pagina_id)
    REFERENCES pagina (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: bloque_tipo_bloque (table: bloque)
ALTER TABLE bloque ADD CONSTRAINT bloque_tipo_bloque
    FOREIGN KEY (tipo_bloque_id)
    REFERENCES tipo_bloque (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: boletin_archivo_multimedia (table: boletin)
ALTER TABLE boletin ADD CONSTRAINT boletin_archivo_multimedia
    FOREIGN KEY (archivo_id)
    REFERENCES archivo_multimedia (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: boletin_sede (table: boletin)
ALTER TABLE boletin ADD CONSTRAINT boletin_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: boletin_usuario (table: boletin)
ALTER TABLE boletin ADD CONSTRAINT boletin_usuario
    FOREIGN KEY (publicado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: conversacion_bot_sede (table: conversacion_bot)
ALTER TABLE conversacion_bot ADD CONSTRAINT conversacion_bot_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: conversacion_bot_usuario (table: conversacion_bot)
ALTER TABLE conversacion_bot ADD CONSTRAINT conversacion_bot_usuario
    FOREIGN KEY (atendida_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: evento_archivo_multimedia (table: evento)
ALTER TABLE evento ADD CONSTRAINT evento_archivo_multimedia
    FOREIGN KEY (imagen_id)
    REFERENCES archivo_multimedia (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: evento_categoria_evento (table: evento)
ALTER TABLE evento ADD CONSTRAINT evento_categoria_evento
    FOREIGN KEY (categoria_evento_id)
    REFERENCES categoria_evento (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: evento_estado_publicacion (table: evento)
ALTER TABLE evento ADD CONSTRAINT evento_estado_publicacion
    FOREIGN KEY (estado_publicacion_id)
    REFERENCES estado_publicacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: evento_sede (table: evento)
ALTER TABLE evento ADD CONSTRAINT evento_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: evento_usuario (table: evento)
ALTER TABLE evento ADD CONSTRAINT evento_usuario
    FOREIGN KEY (creado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: grupo_pastoral_archivo_multimedia (table: grupo_pastoral)
ALTER TABLE grupo_pastoral ADD CONSTRAINT grupo_pastoral_archivo_multimedia
    FOREIGN KEY (imagen_id)
    REFERENCES archivo_multimedia (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: grupo_pastoral_sede (table: grupo_pastoral)
ALTER TABLE grupo_pastoral ADD CONSTRAINT grupo_pastoral_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: horario_sede (table: horario)
ALTER TABLE horario ADD CONSTRAINT horario_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: horario_tipo_horario (table: horario)
ALTER TABLE horario ADD CONSTRAINT horario_tipo_horario
    FOREIGN KEY (tipo_horario_id)
    REFERENCES tipo_horario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: mensaje_bot_conversacion_bot (table: mensaje_bot)
ALTER TABLE mensaje_bot ADD CONSTRAINT mensaje_bot_conversacion_bot
    FOREIGN KEY (conversacion_id)
    REFERENCES conversacion_bot (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: mensaje_bot_pregunta_frecuente (table: mensaje_bot)
ALTER TABLE mensaje_bot ADD CONSTRAINT mensaje_bot_pregunta_frecuente
    FOREIGN KEY (pregunta_frecuente_id)
    REFERENCES pregunta_frecuente (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pagina_actualizado_por (table: pagina)
ALTER TABLE pagina ADD CONSTRAINT pagina_actualizado_por
    FOREIGN KEY (actualizado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pagina_creado_por (table: pagina)
ALTER TABLE pagina ADD CONSTRAINT pagina_creado_por
    FOREIGN KEY (creado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pagina_estado_publicacion (table: pagina)
ALTER TABLE pagina ADD CONSTRAINT pagina_estado_publicacion
    FOREIGN KEY (estado_publicacion_id)
    REFERENCES estado_publicacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pagina_pagina_padre (table: pagina)
ALTER TABLE pagina ADD CONSTRAINT pagina_pagina_padre
    FOREIGN KEY (pagina_padre_id)
    REFERENCES pagina (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pagina_sede (table: pagina)
ALTER TABLE pagina ADD CONSTRAINT pagina_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pregunta_frecuente_sede (table: pregunta_frecuente)
ALTER TABLE pregunta_frecuente ADD CONSTRAINT pregunta_frecuente_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: pregunta_frecuente_servicio (table: pregunta_frecuente)
ALTER TABLE pregunta_frecuente ADD CONSTRAINT pregunta_frecuente_servicio
    FOREIGN KEY (servicio_id)
    REFERENCES servicio (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: proclama_publicacion_proclama (table: proclama_publicacion)
ALTER TABLE proclama_publicacion ADD CONSTRAINT proclama_publicacion_proclama
    FOREIGN KEY (proclama_id)
    REFERENCES proclama (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: proclama_sede (table: proclama)
ALTER TABLE proclama ADD CONSTRAINT proclama_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_archivo_multimedia (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_archivo_multimedia
    FOREIGN KEY (imagen_portada_id)
    REFERENCES archivo_multimedia (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_categoria (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_categoria
    FOREIGN KEY (categoria_id)
    REFERENCES categoria (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_estado_publicacion (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_estado_publicacion
    FOREIGN KEY (estado_publicacion_id)
    REFERENCES estado_publicacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_sede (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_tipo_publicacion (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_tipo_publicacion
    FOREIGN KEY (tipo_publicacion_id)
    REFERENCES tipo_publicacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: publicacion_usuario (table: publicacion)
ALTER TABLE publicacion ADD CONSTRAINT publicacion_usuario
    FOREIGN KEY (autor_id)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: sede_red_social_red_social (table: sede_red_social)
ALTER TABLE sede_red_social ADD CONSTRAINT sede_red_social_red_social
    FOREIGN KEY (red_social_id)
    REFERENCES red_social (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: sede_red_social_sede (table: sede_red_social)
ALTER TABLE sede_red_social ADD CONSTRAINT sede_red_social_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: sede_sede_padre (table: sede)
ALTER TABLE sede ADD CONSTRAINT sede_sede_padre
    FOREIGN KEY (sede_padre_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: sede_tipo_sede (table: sede)
ALTER TABLE sede ADD CONSTRAINT sede_tipo_sede
    FOREIGN KEY (tipo_sede_id)
    REFERENCES tipo_sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: servicio_sede (table: servicio)
ALTER TABLE servicio ADD CONSTRAINT servicio_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: usuario_rol (table: usuario)
ALTER TABLE usuario ADD CONSTRAINT usuario_rol
    FOREIGN KEY (rol_id)
    REFERENCES rol (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: usuario_sede (table: usuario)
ALTER TABLE usuario ADD CONSTRAINT usuario_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: video_sede (table: video)
ALTER TABLE video ADD CONSTRAINT video_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Additional SQL scripts (after create)
-- Índices GIN sobre JSONB (búsqueda dentro del contenido del CMS)
CREATE INDEX bloque_contenido_gin on bloque USING gin (contenido);
CREATE INDEX publicacion_contenido_gin on publicacion USING gin (contenido);
CREATE INDEX servicio_contenido_gin on servicio USING gin (contenido);

-- Búsqueda de texto en español para el asistente virtual
CREATE INDEX pregunta_frecuente_fts on pregunta_frecuente USING gin (to_tsvector('spanish', pregunta || ' ' || respuesta));

-- End of file.
