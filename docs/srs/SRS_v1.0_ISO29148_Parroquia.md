**UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"**

Carrera de Ingeniería de Sistemas — SIS-213 Ingeniería de Software

*Semestre 2 \- 2026 | Grupo: CodeForge*

**ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS)**

Versión 1.0 — Bajo estándar ISO/IEC/IEEE 29148:2018

**Plataforma Web y Sistema de Gestión Parroquial**

| Campo | Detalle |
| ----- | ----- |
| Proyecto | Plataforma Web y Sistema de Gestión Parroquial (pasionistas.org.bo) |
| Organización | Parroquia Señor de la Exaltación (Pasionistas) |
| Consultora | CodeForge |
| Equipo | Alejandro Samiel Trujillo Chuquimia · Ian Jamid Coaquira Uriarte · Mauricio Enrique Lopez Botelo |
| Docente | Ing. M. Sc. Miguel Angel Pacheco Arteaga |
| Estado del documento | Aprobado para línea base v1.0 |
| Fuentes de elicitación | Transcripción de entrevista de coordinación (18/ago); Documento de Requerimientos del Proyecto Parroquial; ADR-01 y ADR-02; Diagramas C1-C3 |

&nbsp;

# **1\. Introducción**

## **1.1 Propósito**

Este documento consolida, bajo la estructura formal de la norma ISO/IEC/IEEE 29148:2018, el catálogo de requisitos funcionales y no funcionales identificados durante el relevamiento realizado con los stakeholders de la Parroquia Señor de la Exaltación (Pasionistas). Su propósito es servir como línea base verificable para el diseño, desarrollo, prueba y trazabilidad de la Plataforma Web y Sistema de Gestión Parroquial.

## **1.2 Alcance**

El sistema comprende: (a) un Portal Web público informativo; (b) un Panel de Administración (CMS) para la secretaría parroquial; (c) un módulo de gestión de sacramentos y proclamas matrimoniales con notas marginales auditadas; (d) un asistente virtual (bot) de atención 24/7; y (e) integraciones con YouTube, redes sociales y el tenant institucional de Microsoft 365\. Quedan fuera del alcance de la versión 1.0 los pagos o donaciones en línea (ver RF-14).

## **1.3 Definiciones, Acrónimos y Abreviaturas**

* CMS: Content Management System — Gestor de Contenidos.

* RF / RNF: Requisito Funcional / Requisito No Funcional.

* MoSCoW: Método de priorización (Must, Should, Could, Won't Have).

* JSONB: Tipo de dato binario semiestructurado de PostgreSQL.

* JWT: JSON Web Token, usado para autenticación y control de roles.

* TTL: Time To Live, tiempo de expiración de una entrada en caché.

* ADR: Architecture Decision Record — Registro de Decisión de Arquitectura.

* C4: Modelo de documentación de arquitectura de software (Contexto, Contenedores, Componentes, Código).

## **1.4 Referencias**

* Transcripción de Audio Adicional — Reunión de coordinación técnica (18 de agosto).

* Requerimientos\_Proyecto\_Parroquia.docx — Minuta consolidada de requerimientos.

* ADRs.docx / ADRs.md — ADR-01 (PostgreSQL \+ JSONB) y ADR-02 (Redis Cache-Aside).

* Diagramas C1 (Contexto), C2 (Contenedores) y C3 (Componentes) del sistema.

* Norma ISO/IEC/IEEE 29148:2018 y guía metodológica de la asignatura SIS-213.

# **2\. Requisitos Funcionales (RF)**

Los siguientes requisitos describen los servicios y funciones que el sistema debe ejecutar. Cada uno se redacta como una especificación atómica, verificable y priorizada mediante el método MoSCoW.

| ID | Descripción del Requisito Funcional | Fuente | Prioridad | Estado |
| ----- | ----- | ----- | ----- | ----- |
| RF-01 | El Portal Web debe mostrar públicamente los horarios de misas, horarios de atención de secretaría y los datos institucionales del párroco y despacho parroquial. | Transcripción Audio (18/ago); Requerimientos Proyecto Parroquia \- Sec.2 | Must Have | Aprobado |
| RF-02 | El sistema debe permitir a la secretaría publicar y actualizar las proclamas matrimoniales vigentes en el portal, conservando un historial público consultable. | Transcripción Audio (18/ago); Requerimientos Proyecto Parroquia \- Sec.2/3 | Must Have | Aprobado |
| RF-03 | El sistema debe permitir registrar notas marginales auditadas sobre las partidas de bautismo (matrimonios posteriores, nulidades canónicas, ordenaciones sacerdotales), quedando vinculadas de forma permanente al acta original. | Requerimientos Proyecto Parroquia \- Sec.4; ADR-01 | Must Have | Aprobado |
| RF-04 | El Panel de Administración (CMS) debe permitir al personal de secretaría crear, editar y eliminar secciones de contenido dinámico (avisos, "Quiénes somos", comunidades, grupos pastorales) sin intervención del equipo de desarrollo. | Requerimientos Proyecto Parroquia \- Sec.3; Transcripción Audio | Must Have | Aprobado |
| RF-05 | El sistema debe permitir incrustar (embed) en el portal videos institucionales alojados en YouTube, con reproducción interna (mini-visualización) y un botón de redirección al canal oficial. | Transcripción Audio (18/ago) | Should Have | Aprobado |
| RF-06 | El Panel de Administración debe permitir a la secretaría cargar y gestionar fotografías y boletines parroquiales, validando el tamaño máximo permitido por archivo antes de almacenarlos. | Transcripción Audio (18/ago) | Should Have | Aprobado |
| RF-07 | El sistema debe integrar un asistente virtual (bot) para WhatsApp/Web que responda automáticamente consultas frecuentes (requisitos de bautismo, fechas de cursillos prematrimoniales, canales de contacto) las 24 horas del día. | Transcripción Audio (18/ago) | Should Have | Aprobado |
| RF-08 | El sistema debe registrar y almacenar las consultas recibidas por el asistente virtual fuera del horario de oficina, dejándolas disponibles para que la secretaría las revise el siguiente día hábil. | Transcripción Audio (18/ago) | Should Have | Aprobado |
| RF-09 | El Portal Web debe mostrar un calendario de próximos eventos parroquiales, retirando de la vista de forma automática los eventos cuya fecha ya haya transcurrido. | Transcripción Audio (18/ago) | Must Have | Aprobado |
| RF-10 | El sistema debe permitir enlazar el portal con las redes sociales activas de la parroquia (Facebook, Instagram, TikTok) y con la red institucional de la Arquidiócesis de La Paz / Vicaría Sur. | Requerimientos Proyecto Parroquia \- Sec.2 | Could Have | Propuesto |
| RF-11 | El sistema debe controlar el acceso al Panel de Administración mediante autenticación basada en roles y tokens JWT, restringiendo las funciones disponibles según el perfil del usuario (secretaría, párroco, equipo de marketing). | ADR-02; Diagrama C3 \- Componentes | Must Have | Aprobado |
| RF-12 | El sistema debe permitir sincronizar los eventos del calendario parroquial con Microsoft 365 (Microsoft Graph Calendar) utilizando el tenant institucional de la parroquia. | Transcripción Audio (18/ago) | Could Have | Propuesto |
| RF-13 | El Portal Web debe presentar contenido diferenciado por sede (Parroquia Señor de la Exaltación, Parroquia de la Resurrección y capillas dependientes) bajo el dominio institucional pasionistas.org.bo. | Requerimientos Proyecto Parroquia \- Sec.1 | Should Have | Aprobado |
| RF-14 | El sistema no incluirá, en la versión 1.0, un módulo de donaciones o pagos en línea, debido al costo por comisiones de las pasarelas de pago identificado durante el relevamiento. | Transcripción Audio (18/ago) | Won't Have | Fuera de alcance v1.0 |

&nbsp;

# **3\. Requisitos No Funcionales (RNF)**

Los requisitos no funcionales especifican atributos de calidad del sistema, redactados de forma cuantitativa y medible conforme a Sommerville e ISO 29148\.

| ID | Atributo | Descripción del RNF | Métrica de Verificación | Prioridad |
| ----- | ----- | ----- | ----- | ----- |
| RNF-01 | Rendimiento | Las consultas públicas de datos semi-estáticos (horarios, avisos, proclamas vigentes) resueltas mediante caché deben responder en ≤ 5 ms; las consultas no cacheadas contra PostgreSQL no deben exceder 2 s de tiempo de respuesta en el 95% de los casos. | Prueba de carga asíncrona sobre el endpoint cacheado y no cacheado | Must Have |
| RNF-02 | Seguridad | Toda comunicación entre el Frontend (Portal/Panel) y la API Backend debe cifrarse mediante HTTPS (TLS); el Panel de Administración debe exigir autenticación JWT con expiración de sesión configurable y las contraseñas deben almacenarse con hashing seguro (bcrypt/argon2). | Inspección de tráfico de red y prueba de penetración básica (OWASP) | Must Have |
| RNF-03 | Disponibilidad | El Portal Web público debe mantener una disponibilidad mensual ≥ 99%, considerando las restricciones de infraestructura (servidores UCB o nube gratuita/económica) descritas en el relevamiento. | Monitoreo de uptime durante 30 días continuos | Should Have |
| RNF-04 | Usabilidad | El personal de secretaría, sin perfil técnico, debe poder publicar un aviso, boletín o evento en el CMS en un máximo de 3 pasos y 2 minutos, sin necesidad de capacitación técnica adicional. | Prueba de usabilidad con usuario representativo (secretaría) y cronometraje de tarea | Must Have |
| RNF-05 | Mantenibilidad (Almacenamiento) | El almacenamiento multimedia debe soportar hasta 50 GB totales, admitiendo fotografías de hasta 30 MB y videos en alta calidad de hasta 2 GB por archivo, sin requerir cambios de arquitectura al ampliar el plan. | Inspección de configuración del servicio de almacenamiento en la nube | Should Have |
| RNF-06 | Mantenibilidad (CMS) | Las secciones de contenido dinámico del CMS y las notas marginales deben poder modificarse mediante columnas JSONB indexadas, sin requerir despliegue de código ni migraciones DDL recurrentes. | Prueba funcional de alta/edición de un bloque de contenido sin despliegue | Must Have |

&nbsp;

# **4\. Matriz de Atributos de Requisitos**

Registro de control de auditoría por cada requerimiento: prioridad, estabilidad, nivel de riesgo, método de verificación y componente C4 asociado.

| ID Req. | Prioridad | Estabilidad | Riesgo | Método de Verificación | Componente(s) C4 Asociado(s) |
| ----- | ----- | ----- | ----- | ----- | ----- |
| RF-01 | Must Have | Estable | Bajo | Prueba funcional | Portal Web |
| RF-02 | Must Have | Estable | Alto | Prueba funcional / Inspección | Portal Web; Módulo de Sacramentos y Proclamas |
| RF-03 | Must Have | Estable | Alto | Prueba funcional | Módulo de Sacramentos y Proclamas; Base de Datos Relacional |
| RF-04 | Must Have | Estable | Medio | Demostración | Panel de Administración; Módulo de Contenido y Calendario (CMS) |
| RF-05 | Should Have | Firme | Bajo | Prueba funcional | Portal Web; Servicio YouTube (externo) |
| RF-06 | Should Have | Firme | Medio | Prueba funcional | Panel de Administración; Almacenamiento Multimedia |
| RF-07 | Should Have | Volátil | Medio | Prueba funcional | Widget / Bot Asistente; Módulo de Integraciones y Notificaciones |
| RF-08 | Should Have | Volátil | Medio | Prueba funcional | Módulo de Integraciones y Notificaciones; Base de Datos Relacional |
| RF-09 | Must Have | Estable | Bajo | Prueba funcional | Módulo de Contenido y Calendario (CMS); Caché en Memoria (Redis) |
| RF-10 | Could Have | Volátil | Bajo | Inspección | Módulo de Integraciones y Notificaciones; Tenant Microsoft & Meta |
| RF-11 | Must Have | Estable | Alto | Inspección / Prueba de seguridad | API Gateway & Router de Autenticación |
| RF-12 | Could Have | Volátil | Medio | Análisis | Módulo de Integraciones y Notificaciones; Tenant Microsoft & Meta |
| RF-13 | Should Have | Firme | Bajo | Demostración | Portal Web; Panel de Administración |
| RF-14 | Won't Have | N/A | N/A | N/A (fuera de alcance v1.0) | N/A |
| RNF-01 | Must Have | Estable | Medio | Prueba de carga | Caché en Memoria (Redis); Base de Datos Relacional |
| RNF-02 | Must Have | Estable | Alto | Inspección de tráfico / Pentest | API Gateway & Router de Autenticación |
| RNF-03 | Should Have | Volátil | Medio | Análisis de infraestructura | Toda la plataforma (Infraestructura de hosting) |
| RNF-04 | Must Have | Estable | Medio | Prueba de usabilidad | Panel de Administración |
| RNF-05 | Should Have | Firme | Bajo | Inspección | Almacenamiento Multimedia |
| RNF-06 | Must Have | Estable | Bajo | Prueba funcional | Base de Datos Relacional (JSONB); Módulo de Contenido y Calendario (CMS) |

&nbsp;

# **5\. Matriz de Trazabilidad Bidireccional**

Mapeo bidireccional que conecta cada requisito con su fuente de elicitación, su historia de usuario en Jira, el/los componente(s) C4 que lo implementan y su caso de prueba de verificación correspondiente.

| ID Req. | Fuente de Elicitación | Historia de Usuario (Jira) | Componente C4 | Caso de Prueba |
| ----- | ----- | ----- | ----- | ----- |
| RF-01 | Transcripción Audio (18/ago); Req. Sec.2 | PARR-101 | Portal Web | CP-01 |
| RF-02 | Transcripción Audio (18/ago); Req. Sec.2/3 | PARR-102 | Portal Web; Módulo de Sacramentos y Proclamas | CP-02 |
| RF-03 | Req. Sec.4; ADR-01 | PARR-103 | Módulo de Sacramentos y Proclamas; Base de Datos Relacional | CP-03 |
| RF-04 | Req. Sec.3; Transcripción Audio | PARR-104 | Panel de Administración; Módulo de Contenido y Calendario (CMS) | CP-04 |
| RF-05 | Transcripción Audio (18/ago) | PARR-105 | Portal Web; Servicio YouTube | CP-05 |
| RF-06 | Transcripción Audio (18/ago) | PARR-106 | Panel de Administración; Almacenamiento Multimedia | CP-06 |
| RF-07 | Transcripción Audio (18/ago) | PARR-107 | Widget / Bot Asistente; Módulo de Integraciones | CP-07 |
| RF-08 | Transcripción Audio (18/ago) | PARR-108 | Módulo de Integraciones; Base de Datos Relacional | CP-08 |
| RF-09 | Transcripción Audio (18/ago) | PARR-109 | Módulo de Contenido y Calendario (CMS); Redis | CP-09 |
| RF-10 | Req. Sec.2 | PARR-110 | Módulo de Integraciones; Tenant Microsoft & Meta | CP-10 |
| RF-11 | ADR-02; Diagrama C3 | PARR-111 | API Gateway & Router de Autenticación | CP-11 |
| RF-12 | Transcripción Audio (18/ago) | PARR-112 | Módulo de Integraciones; Tenant Microsoft & Meta | CP-12 |
| RF-13 | Req. Sec.1 | PARR-113 | Portal Web; Panel de Administración | CP-13 |
| RF-14 | Transcripción Audio (18/ago) | PARR-114 | N/A (fuera de alcance) | N/A |
| RNF-01 | ADR-02 | PARR-115 | Caché en Memoria (Redis); Base de Datos Relacional | CP-15 |
| RNF-02 | Diagrama C3; ADR-02 | PARR-116 | API Gateway & Router de Autenticación | CP-16 |
| RNF-03 | Req. Sec.5; Transcripción Audio | PARR-117 | Infraestructura de hosting | CP-17 |
| RNF-04 | Req. Sec.3; Transcripción Audio | PARR-118 | Panel de Administración | CP-18 |
| RNF-05 | Transcripción Audio (18/ago) | PARR-119 | Almacenamiento Multimedia | CP-19 |
| RNF-06 | ADR-01 | PARR-120 | Base de Datos Relacional (JSONB) | CP-20 |

&nbsp;

## **Notas de validación**

* RF-14 se documenta como referencia de alcance negativo (Won't Have) para dejar constancia de la decisión de negocio de excluir pagos en línea en v1.0, por lo que no posee componente C4 ni caso de prueba asociados.

* RF-10 y RF-12 quedan en estado "Propuesto": dependen de un análisis de viabilidad técnica y de costos (integraciones con Meta/WhatsApp Business API y Microsoft Graph) antes de pasar a estado Aprobado.

* Los identificadores de Historia de Usuario (PARR-1xx) y de Caso de Prueba (CP-xx) deben sincronizarse con el backlog real del proyecto en Jira al momento de la implementación.