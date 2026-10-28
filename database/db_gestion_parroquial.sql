-- Created by Redgate Data Modeler
-- Last modification date: 2026-10-26 10:12:37.418
-- Model: db_gestion_parroquial — Sistema de gestión online (PostgreSQL 16)

-- tables
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
    CONSTRAINT bitacora_cambio_accion_ck CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'PRINT')),
    CONSTRAINT bitacora_cambio_pk PRIMARY KEY (id)
);

CREATE INDEX bitacora_cambio_idx_1 on bitacora_cambio (entidad ASC, entidad_id ASC);

-- Table: certificado
CREATE TABLE certificado (
    id serial  NOT NULL,
    partida_id int  NOT NULL,
    emitido_por int  NOT NULL,
    codigo_verificacion varchar(20)  NOT NULL,
    incluye_notas_marginales boolean  NOT NULL DEFAULT true,
    solicitante varchar(150)  NOT NULL,
    motivo varchar(150)  NULL,
    url_pdf varchar(500)  NULL,
    fecha_emision timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT certificado_ak_1 UNIQUE (codigo_verificacion) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT certificado_pk PRIMARY KEY (id)
);

-- Table: estado_tramite
CREATE TABLE estado_tramite (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT estado_tramite_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT estado_tramite_pk PRIMARY KEY (id)
);

-- Table: intencion_misa
CREATE TABLE intencion_misa (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    registrado_por int  NOT NULL,
    fecha_misa timestamptz  NOT NULL,
    tipo varchar(20)  NOT NULL,
    intencion varchar(300)  NOT NULL,
    solicitante varchar(150)  NULL,
    telefono_solicitante varchar(30)  NULL,
    ofrenda_bs numeric(10,2)  NULL,
    fecha_registro timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT intencion_misa_tipo_ck CHECK (tipo IN ('DIFUNTO', 'ACCION_DE_GRACIAS', 'SALUD', 'OTRA')),
    CONSTRAINT intencion_misa_ofrenda_ck CHECK (ofrenda_bs IS NULL OR ofrenda_bs >= 0),
    CONSTRAINT intencion_misa_pk PRIMARY KEY (id)
);

CREATE INDEX intencion_misa_idx_1 on intencion_misa (fecha_misa ASC);

-- Table: libro_sacramental
CREATE TABLE libro_sacramental (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    tipo_sacramento_id int  NOT NULL,
    numero_libro smallint  NOT NULL,
    anio smallint  NOT NULL,
    fecha_apertura date  NOT NULL,
    fecha_cierre date  NULL,
    fecha_empastado date  NULL,
    CONSTRAINT libro_sacramental_ak_1 UNIQUE (sede_id, tipo_sacramento_id, numero_libro) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT libro_sacramental_fechas_ck CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_apertura),
    CONSTRAINT libro_sacramental_pk PRIMARY KEY (id)
);

-- Table: ministro
CREATE TABLE ministro (
    id serial  NOT NULL,
    nombre_completo varchar(150)  NOT NULL,
    titulo varchar(30)  NOT NULL,
    cargo varchar(60)  NULL,
    congregacion varchar(60)  NULL,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT ministro_pk PRIMARY KEY (id)
);

-- Table: nota_marginal
CREATE TABLE nota_marginal (
    id serial  NOT NULL,
    uuid uuid  NOT NULL DEFAULT gen_random_uuid(),
    partida_id int  NOT NULL,
    tipo_nota_marginal_id int  NOT NULL,
    partida_relacionada_id int  NULL,
    registrado_por int  NOT NULL,
    fecha_hecho date  NOT NULL,
    parroquia_hecho varchar(150)  NULL,
    descripcion text  NOT NULL,
    fecha_registro timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT nota_marginal_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT nota_marginal_origen_ck CHECK (partida_relacionada_id IS NOT NULL OR parroquia_hecho IS NOT NULL),
    CONSTRAINT nota_marginal_pk PRIMARY KEY (id)
);

CREATE INDEX nota_marginal_idx_1 on nota_marginal (partida_id ASC);

-- Table: participante_partida
CREATE TABLE participante_partida (
    partida_id int  NOT NULL,
    persona_id int  NOT NULL,
    tipo_participacion_id int  NOT NULL,
    CONSTRAINT participante_partida_pk PRIMARY KEY (partida_id,persona_id,tipo_participacion_id)
);

CREATE INDEX participante_partida_idx_1 on participante_partida (persona_id ASC);

-- Table: partida
CREATE TABLE partida (
    id serial  NOT NULL,
    uuid uuid  NOT NULL DEFAULT gen_random_uuid(),
    libro_id int  NOT NULL,
    tramite_id int  NULL,
    ministro_id int  NOT NULL,
    registrado_por int  NOT NULL,
    numero_partida int  NOT NULL,
    folio smallint  NOT NULL,
    fecha_celebracion date  NOT NULL,
    observaciones text  NULL,
    anulada boolean  NOT NULL DEFAULT false,
    motivo_anulacion varchar(300)  NULL,
    fecha_registro timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT partida_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT partida_ak_2 UNIQUE (libro_id, numero_partida) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT partida_ak_3 UNIQUE (tramite_id) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT partida_anulacion_ck CHECK (anulada = false OR motivo_anulacion IS NOT NULL),
    CONSTRAINT partida_pk PRIMARY KEY (id)
);

-- Table: persona
CREATE TABLE persona (
    id serial  NOT NULL,
    uuid uuid  NOT NULL DEFAULT gen_random_uuid(),
    nombres varchar(100)  NOT NULL,
    apellido_paterno varchar(60)  NULL,
    apellido_materno varchar(60)  NULL,
    sexo char(1)  NOT NULL,
    fecha_nacimiento date  NULL,
    lugar_nacimiento varchar(150)  NULL,
    documento_identidad varchar(20)  NULL,
    telefono varchar(30)  NULL,
    correo varchar(120)  NULL,
    fecha_registro timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT persona_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT persona_ak_2 UNIQUE (documento_identidad) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT persona_sexo_ck CHECK (sexo IN ('M', 'F')),
    CONSTRAINT persona_pk PRIMARY KEY (id)
);

CREATE INDEX persona_idx_1 on persona (apellido_paterno ASC, apellido_materno ASC, nombres ASC);

-- Table: proclama
CREATE TABLE proclama (
    id serial  NOT NULL,
    tramite_id int  NOT NULL,
    numero_proclama smallint  NOT NULL,
    fecha_publicacion date  NOT NULL,
    fecha_envio_portal timestamptz  NULL,
    CONSTRAINT proclama_ak_1 UNIQUE (tramite_id, numero_proclama) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT proclama_numero_ck CHECK (numero_proclama BETWEEN 1 AND 3),
    CONSTRAINT proclama_pk PRIMARY KEY (id)
);

-- Table: requisito
CREATE TABLE requisito (
    id serial  NOT NULL,
    tipo_sacramento_id int  NOT NULL,
    nombre varchar(150)  NOT NULL,
    descripcion varchar(300)  NULL,
    obligatorio boolean  NOT NULL DEFAULT true,
    orden smallint  NOT NULL DEFAULT 0,
    CONSTRAINT requisito_pk PRIMARY KEY (id)
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
    codigo varchar(20)  NOT NULL,
    nombre varchar(120)  NOT NULL,
    tipo varchar(20)  NOT NULL,
    arquidiocesis varchar(120)  NOT NULL,
    vicaria varchar(120)  NULL,
    direccion varchar(200)  NULL,
    telefono varchar(30)  NULL,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT sede_ak_1 UNIQUE (codigo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT sede_tipo_ck CHECK (tipo IN ('PARROQUIA', 'CAPILLA')),
    CONSTRAINT sede_pk PRIMARY KEY (id)
);

-- Table: tipo_nota_marginal
CREATE TABLE tipo_nota_marginal (
    id serial  NOT NULL,
    nombre varchar(60)  NOT NULL,
    CONSTRAINT tipo_nota_marginal_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_nota_marginal_pk PRIMARY KEY (id)
);

-- Table: tipo_participacion
CREATE TABLE tipo_participacion (
    id serial  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT tipo_participacion_ak_1 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_participacion_pk PRIMARY KEY (id)
);

-- Table: tipo_sacramento
CREATE TABLE tipo_sacramento (
    id serial  NOT NULL,
    codigo varchar(10)  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT tipo_sacramento_ak_1 UNIQUE (codigo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_sacramento_ak_2 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_sacramento_pk PRIMARY KEY (id)
);

-- Table: tramite
CREATE TABLE tramite (
    id serial  NOT NULL,
    sede_id int  NOT NULL,
    tipo_sacramento_id int  NOT NULL,
    estado_tramite_id int  NOT NULL,
    registrado_por int  NOT NULL,
    fecha_solicitud date  NOT NULL DEFAULT current_date,
    fecha_programada timestamptz  NULL,
    observaciones text  NULL,
    CONSTRAINT tramite_pk PRIMARY KEY (id)
);

CREATE INDEX tramite_idx_1 on tramite (estado_tramite_id ASC, fecha_programada ASC);

-- Table: tramite_persona
CREATE TABLE tramite_persona (
    tramite_id int  NOT NULL,
    persona_id int  NOT NULL,
    tipo_participacion_id int  NOT NULL,
    CONSTRAINT tramite_persona_pk PRIMARY KEY (tramite_id,persona_id,tipo_participacion_id)
);

-- Table: tramite_requisito
CREATE TABLE tramite_requisito (
    tramite_id int  NOT NULL,
    requisito_id int  NOT NULL,
    fecha_entrega date  NOT NULL,
    url_documento varchar(500)  NULL,
    verificado_por int  NULL,
    CONSTRAINT tramite_requisito_pk PRIMARY KEY (tramite_id,requisito_id)
);

-- Table: usuario
CREATE TABLE usuario (
    id serial  NOT NULL,
    rol_id int  NOT NULL,
    sede_id int  NOT NULL,
    nombre_completo varchar(120)  NOT NULL,
    correo varchar(120)  NOT NULL,
    hash_contrasena varchar(255)  NOT NULL,
    activo boolean  NOT NULL DEFAULT true,
    fecha_ultimo_acceso timestamptz  NULL,
    fecha_creacion timestamptz  NOT NULL DEFAULT now(),
    CONSTRAINT usuario_ak_1 UNIQUE (correo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT usuario_pk PRIMARY KEY (id)
);

-- foreign keys
-- Reference: bitacora_cambio_usuario (table: bitacora_cambio)
ALTER TABLE bitacora_cambio ADD CONSTRAINT bitacora_cambio_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: certificado_partida (table: certificado)
ALTER TABLE certificado ADD CONSTRAINT certificado_partida
    FOREIGN KEY (partida_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: certificado_usuario (table: certificado)
ALTER TABLE certificado ADD CONSTRAINT certificado_usuario
    FOREIGN KEY (emitido_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: intencion_misa_sede (table: intencion_misa)
ALTER TABLE intencion_misa ADD CONSTRAINT intencion_misa_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: intencion_misa_usuario (table: intencion_misa)
ALTER TABLE intencion_misa ADD CONSTRAINT intencion_misa_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: libro_sacramental_sede (table: libro_sacramental)
ALTER TABLE libro_sacramental ADD CONSTRAINT libro_sacramental_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: libro_sacramental_tipo_sacramento (table: libro_sacramental)
ALTER TABLE libro_sacramental ADD CONSTRAINT libro_sacramental_tipo_sacramento
    FOREIGN KEY (tipo_sacramento_id)
    REFERENCES tipo_sacramento (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: nota_marginal_partida (table: nota_marginal)
ALTER TABLE nota_marginal ADD CONSTRAINT nota_marginal_partida
    FOREIGN KEY (partida_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: nota_marginal_partida_relacionada (table: nota_marginal)
ALTER TABLE nota_marginal ADD CONSTRAINT nota_marginal_partida_relacionada
    FOREIGN KEY (partida_relacionada_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: nota_marginal_tipo_nota_marginal (table: nota_marginal)
ALTER TABLE nota_marginal ADD CONSTRAINT nota_marginal_tipo_nota_marginal
    FOREIGN KEY (tipo_nota_marginal_id)
    REFERENCES tipo_nota_marginal (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: nota_marginal_usuario (table: nota_marginal)
ALTER TABLE nota_marginal ADD CONSTRAINT nota_marginal_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: participante_partida_partida (table: participante_partida)
ALTER TABLE participante_partida ADD CONSTRAINT participante_partida_partida
    FOREIGN KEY (partida_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: participante_partida_persona (table: participante_partida)
ALTER TABLE participante_partida ADD CONSTRAINT participante_partida_persona
    FOREIGN KEY (persona_id)
    REFERENCES persona (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: participante_partida_tipo_participacion (table: participante_partida)
ALTER TABLE participante_partida ADD CONSTRAINT participante_partida_tipo_participacion
    FOREIGN KEY (tipo_participacion_id)
    REFERENCES tipo_participacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: partida_libro_sacramental (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_libro_sacramental
    FOREIGN KEY (libro_id)
    REFERENCES libro_sacramental (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: partida_ministro (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_ministro
    FOREIGN KEY (ministro_id)
    REFERENCES ministro (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: partida_tramite (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_tramite
    FOREIGN KEY (tramite_id)
    REFERENCES tramite (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: partida_usuario (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: proclama_tramite (table: proclama)
ALTER TABLE proclama ADD CONSTRAINT proclama_tramite
    FOREIGN KEY (tramite_id)
    REFERENCES tramite (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: requisito_tipo_sacramento (table: requisito)
ALTER TABLE requisito ADD CONSTRAINT requisito_tipo_sacramento
    FOREIGN KEY (tipo_sacramento_id)
    REFERENCES tipo_sacramento (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_estado_tramite (table: tramite)
ALTER TABLE tramite ADD CONSTRAINT tramite_estado_tramite
    FOREIGN KEY (estado_tramite_id)
    REFERENCES estado_tramite (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_persona_persona (table: tramite_persona)
ALTER TABLE tramite_persona ADD CONSTRAINT tramite_persona_persona
    FOREIGN KEY (persona_id)
    REFERENCES persona (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_persona_tipo_participacion (table: tramite_persona)
ALTER TABLE tramite_persona ADD CONSTRAINT tramite_persona_tipo_participacion
    FOREIGN KEY (tipo_participacion_id)
    REFERENCES tipo_participacion (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_persona_tramite (table: tramite_persona)
ALTER TABLE tramite_persona ADD CONSTRAINT tramite_persona_tramite
    FOREIGN KEY (tramite_id)
    REFERENCES tramite (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_requisito_requisito (table: tramite_requisito)
ALTER TABLE tramite_requisito ADD CONSTRAINT tramite_requisito_requisito
    FOREIGN KEY (requisito_id)
    REFERENCES requisito (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_requisito_tramite (table: tramite_requisito)
ALTER TABLE tramite_requisito ADD CONSTRAINT tramite_requisito_tramite
    FOREIGN KEY (tramite_id)
    REFERENCES tramite (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_requisito_usuario (table: tramite_requisito)
ALTER TABLE tramite_requisito ADD CONSTRAINT tramite_requisito_usuario
    FOREIGN KEY (verificado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_sede (table: tramite)
ALTER TABLE tramite ADD CONSTRAINT tramite_sede
    FOREIGN KEY (sede_id)
    REFERENCES sede (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_tipo_sacramento (table: tramite)
ALTER TABLE tramite ADD CONSTRAINT tramite_tipo_sacramento
    FOREIGN KEY (tipo_sacramento_id)
    REFERENCES tipo_sacramento (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: tramite_usuario (table: tramite)
ALTER TABLE tramite ADD CONSTRAINT tramite_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
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

-- Additional SQL scripts (after create)
-- Búsqueda de personas sin distinguir mayúsculas (libros sacramentales)
CREATE INDEX persona_nombre_busqueda on persona (lower(apellido_paterno), lower(apellido_materno), lower(nombres));

-- End of file.
