-- Created by Redgate Data Modeler
-- Last modification date: 2026-10-26 10:12:37.418
-- Model: db_gestion_local — Sistema de gestión offline (equipo local) (PostgreSQL 16)

-- tables
-- Table: certificado_emitido
CREATE TABLE certificado_emitido (
    id serial  NOT NULL,
    partida_id int  NOT NULL,
    emitido_por int  NOT NULL,
    solicitante varchar(150)  NOT NULL,
    fecha_emision timestamp  NOT NULL DEFAULT now(),
    CONSTRAINT certificado_emitido_pk PRIMARY KEY (id)
);

-- Table: configuracion_parroquia
CREATE TABLE configuracion_parroquia (
    id smallint  NOT NULL,
    nombre_parroquia varchar(120)  NOT NULL,
    arquidiocesis varchar(120)  NOT NULL,
    vicaria varchar(120)  NULL,
    direccion varchar(200)  NULL,
    ciudad varchar(60)  NOT NULL,
    nombre_parroco varchar(150)  NOT NULL,
    ruta_logo varchar(255)  NULL,
    CONSTRAINT configuracion_parroquia_unica_ck CHECK (id = 1),
    CONSTRAINT configuracion_parroquia_pk PRIMARY KEY (id)
);

-- Table: libro
CREATE TABLE libro (
    id serial  NOT NULL,
    tipo_sacramento_id int  NOT NULL,
    numero_libro smallint  NOT NULL,
    anio smallint  NOT NULL,
    fecha_cierre date  NULL,
    CONSTRAINT libro_ak_1 UNIQUE (tipo_sacramento_id, numero_libro) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT libro_pk PRIMARY KEY (id)
);

-- Table: ministro
CREATE TABLE ministro (
    id serial  NOT NULL,
    nombre_completo varchar(150)  NOT NULL,
    titulo varchar(30)  NULL,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT ministro_pk PRIMARY KEY (id)
);

-- Table: nota_marginal
CREATE TABLE nota_marginal (
    id serial  NOT NULL,
    uuid uuid  NOT NULL DEFAULT gen_random_uuid(),
    partida_id int  NOT NULL,
    registrado_por int  NOT NULL,
    tipo varchar(30)  NOT NULL,
    fecha_hecho date  NOT NULL,
    lugar_hecho varchar(150)  NULL,
    descripcion text  NOT NULL,
    fecha_registro timestamp  NOT NULL DEFAULT now(),
    exportado boolean  NOT NULL DEFAULT false,
    CONSTRAINT nota_marginal_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT nota_marginal_tipo_ck CHECK (tipo IN ('CONFIRMACION', 'MATRIMONIO', 'NULIDAD', 'ORDENACION', 'PROFESION_RELIGIOSA', 'RECTIFICACION')),
    CONSTRAINT nota_marginal_pk PRIMARY KEY (id)
);

CREATE INDEX nota_marginal_idx_1 on nota_marginal (partida_id ASC);

-- Table: participante
CREATE TABLE participante (
    partida_id int  NOT NULL,
    persona_id int  NOT NULL,
    rol varchar(20)  NOT NULL,
    CONSTRAINT participante_rol_ck CHECK (rol IN ('TITULAR', 'CONTRAYENTE', 'PADRE', 'MADRE', 'PADRINO', 'MADRINA', 'TESTIGO')),
    CONSTRAINT participante_pk PRIMARY KEY (partida_id,persona_id,rol)
);

CREATE INDEX participante_idx_1 on participante (persona_id ASC);

-- Table: partida
CREATE TABLE partida (
    id serial  NOT NULL,
    uuid uuid  NOT NULL DEFAULT gen_random_uuid(),
    libro_id int  NOT NULL,
    ministro_id int  NOT NULL,
    registrado_por int  NOT NULL,
    numero_partida int  NOT NULL,
    folio smallint  NOT NULL,
    fecha_celebracion date  NOT NULL,
    observaciones text  NULL,
    fecha_registro timestamp  NOT NULL DEFAULT now(),
    exportado boolean  NOT NULL DEFAULT false,
    CONSTRAINT partida_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT partida_ak_2 UNIQUE (libro_id, numero_partida) NOT DEFERRABLE  INITIALLY IMMEDIATE,
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
    CONSTRAINT persona_ak_1 UNIQUE (uuid) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT persona_sexo_ck CHECK (sexo IN ('M', 'F')),
    CONSTRAINT persona_pk PRIMARY KEY (id)
);

CREATE INDEX persona_idx_1 on persona (apellido_paterno ASC, apellido_materno ASC, nombres ASC);

-- Table: tipo_sacramento
CREATE TABLE tipo_sacramento (
    id serial  NOT NULL,
    codigo varchar(10)  NOT NULL,
    nombre varchar(40)  NOT NULL,
    CONSTRAINT tipo_sacramento_ak_1 UNIQUE (codigo) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_sacramento_ak_2 UNIQUE (nombre) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT tipo_sacramento_pk PRIMARY KEY (id)
);

-- Table: usuario
CREATE TABLE usuario (
    id serial  NOT NULL,
    nombre_usuario varchar(40)  NOT NULL,
    nombre_completo varchar(120)  NOT NULL,
    hash_contrasena varchar(255)  NOT NULL,
    es_administrador boolean  NOT NULL DEFAULT false,
    activo boolean  NOT NULL DEFAULT true,
    CONSTRAINT usuario_ak_1 UNIQUE (nombre_usuario) NOT DEFERRABLE  INITIALLY IMMEDIATE,
    CONSTRAINT usuario_pk PRIMARY KEY (id)
);

-- foreign keys
-- Reference: certificado_emitido_partida (table: certificado_emitido)
ALTER TABLE certificado_emitido ADD CONSTRAINT certificado_emitido_partida
    FOREIGN KEY (partida_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: certificado_emitido_usuario (table: certificado_emitido)
ALTER TABLE certificado_emitido ADD CONSTRAINT certificado_emitido_usuario
    FOREIGN KEY (emitido_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: libro_tipo_sacramento (table: libro)
ALTER TABLE libro ADD CONSTRAINT libro_tipo_sacramento
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

-- Reference: nota_marginal_usuario (table: nota_marginal)
ALTER TABLE nota_marginal ADD CONSTRAINT nota_marginal_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: participante_partida (table: participante)
ALTER TABLE participante ADD CONSTRAINT participante_partida
    FOREIGN KEY (partida_id)
    REFERENCES partida (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: participante_persona (table: participante)
ALTER TABLE participante ADD CONSTRAINT participante_persona
    FOREIGN KEY (persona_id)
    REFERENCES persona (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- Reference: partida_libro (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_libro
    FOREIGN KEY (libro_id)
    REFERENCES libro (id)  
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

-- Reference: partida_usuario (table: partida)
ALTER TABLE partida ADD CONSTRAINT partida_usuario
    FOREIGN KEY (registrado_por)
    REFERENCES usuario (id)  
    NOT DEFERRABLE 
    INITIALLY IMMEDIATE
;

-- End of file.
