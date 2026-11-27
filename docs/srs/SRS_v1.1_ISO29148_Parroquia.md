**UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"**

Carrera de Ingeniería de Sistemas — SIS-213 Ingeniería de Software

*Semestre 2 \- 2026 | Grupo: CodeForge*

**ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS)**

Versión 1.1 — Bajo estándar ISO/IEC/IEEE 29148:2018

**Plataforma Web y Sistema de Gestión Parroquial**

| Campo | Detalle |
| ----- | ----- |
| Proyecto | Plataforma Web y Sistema de Gestión Parroquial (pasionistas.org.bo) |
| Organización | Parroquia Señor de la Exaltación (Pasionistas) |
| Consultora | CodeForge |
| Equipo | Alejandro Samiel Trujillo Chuquimia · Ian Jamid Coaquira Uriarte · Mauricio Enrique Lopez Botelo |
| Docente | Ing. M. Sc. Miguel Angel Pacheco Arteaga |
| Estado del documento | Línea base v1.1 (alcance de la versión 2.0 del sistema) |
| Fuentes de elicitación | Transcripción de entrevista de coordinación (18/ago); Minuta de entrevista Acta N.° 01 (`docs/entrevistas/`); Documento de Requerimientos del Proyecto Parroquial; ADR-01 a ADR-04; modelo C4 v2; observaciones del Sprint 3 del docente, del párroco, de los ingenieros y de marketing (sección 5) |

## **Control de versiones**

| Versión | Fecha | Autor | Motivo del cambio |
| ----- | ----- | ----- | ----- |
| 1.0 | Septiembre 2026 | Ian Jamid Coaquira Uriarte | Línea base inicial a partir del relevamiento con la parroquia. Se conserva sin cambios en `docs/srs/SRS_v1.0_ISO29148_Parroquia.md`. |
| 1.1 | 27/11/2026 | Ian Jamid Coaquira Uriarte | Correcciones del Sprint 3: observaciones del docente (paginación, exportación CSV por rol, registro de consultas), del párroco, de los ingenieros de la parroquia y de marketing. Se pospone fuera de la v2.0 lo que no se implementó (notas marginales, bot e integración con Microsoft 365) y se actualizan los componentes al modelo C4 v2. |

&nbsp;

# **1\. Introducción**

## **1.1 Propósito**

Este documento consolida, bajo la estructura formal de la norma ISO/IEC/IEEE 29148:2018, el catálogo de requisitos funcionales y no funcionales de la Plataforma Web y Sistema de Gestión Parroquial. La versión 1.1 actualiza la línea base 1.0 con las correcciones recibidas en el Sprint 3 y la ajusta al sistema realmente construido (versión 2.0), para servir como referencia verificable del diseño, las pruebas y la trazabilidad.

## **1.2 Alcance**

El sistema comprende: (a) un Portal Web público por sede; (b) un Panel de Administración (CMS) con roles para el personal de la parroquia; (c) la publicación de proclamas matrimoniales con su historial y un canal de observaciones confidenciales; y (d) la inclusión de videos de YouTube y enlaces a redes sociales.

**Fuera del alcance de la versión 2.0 (pospuesto):** el registro de notas marginales en partidas de bautismo (RF-03), el asistente virtual o bot y el registro de sus consultas (RF-07 y RF-08) y la sincronización con Microsoft 365 (RF-12). **Fuera del alcance del proyecto:** los pagos o donaciones en línea (RF-14).

## **1.3 Definiciones, Acrónimos y Abreviaturas**

* CMS: Content Management System — Gestor de Contenidos.

* RF / RNF: Requisito Funcional / Requisito No Funcional.

* MoSCoW: Método de priorización (Must, Should, Could, Won't Have).

* JSONB: Tipo de dato binario semiestructurado de PostgreSQL.

* JWT: JSON Web Token, usado para autenticación y control de roles.

* TTL: Time To Live, tiempo de expiración de una entrada en caché.

* ADR: Architecture Decision Record — Registro de Decisión de Arquitectura.

* C4: Modelo de documentación de arquitectura de software (Contexto, Contenedores, Componentes, Código).

* CSV: Comma-Separated Values, archivo de texto tabular que se abre en hojas de cálculo.

* OCI: Oracle Cloud Infrastructure; su Object Storage guarda los archivos multimedia.

* Pospuesto: requisito válido que no forma parte de la versión 2.0; se prioriza como Won't Have para esta versión.

## **1.4 Referencias**

* Transcripción de Audio Adicional — Reunión de coordinación técnica (18 de agosto).

* Minuta de Entrevista con Stakeholders, Acta N.° 01 (`docs/entrevistas/Minuta_Entrevista_Parroquia_Completada.md`).

* Requerimientos\_Proyecto\_Parroquia.docx — Minuta consolidada de requerimientos.

* `docs/arquitectura/ADRs.md` — ADR-01 (PostgreSQL + JSONB), ADR-02 (Redis), ADR-03 (stack Node.js y PostgreSQL) y ADR-04 (almacenamiento en OCI).

* `docs/arquitectura/Arquitectura C4.md` — modelo C4 v2 (fuentes en `modelos/c4/v2/`).

* `docs/uml/` — paquete UML (clases del dominio y diagramas de secuencia).

* `docs/api/` — contrato de la API REST.

* Norma ISO/IEC/IEEE 29148:2018 y guía metodológica de la asignatura SIS-213.

# **2\. Requisitos Funcionales (RF)**

Los siguientes requisitos describen los servicios y funciones que el sistema debe ejecutar. Cada uno se redacta como una especificación atómica, verificable y priorizada mediante el método MoSCoW. La columna «Estado v2.0» indica si el requisito está implementado en la versión 2.0 del sistema.

| ID | Descripción del Requisito Funcional | Fuente | Prioridad | Estado v2.0 |
| ----- | ----- | ----- | ----- | ----- |
| RF-01 | El Portal Web debe mostrar públicamente los horarios de misas, horarios de atención de secretaría y los datos institucionales del párroco y despacho parroquial. | Transcripción Audio (18/ago); Requerimientos Proyecto Parroquia \- Sec.2 | Must Have | Implementado |
| RF-02 | El sistema debe permitir a la secretaría publicar y actualizar las proclamas matrimoniales vigentes en el portal, conservando un historial público consultable. | Transcripción Audio (18/ago); Requerimientos Proyecto Parroquia \- Sec.2/3 | Must Have | Implementado |
| RF-03 | El sistema debe permitir registrar notas marginales auditadas sobre las partidas de bautismo (matrimonios posteriores, nulidades canónicas, ordenaciones sacerdotales), quedando vinculadas de forma permanente al acta original. | Requerimientos Proyecto Parroquia \- Sec.4; ADR-01 | Won't Have (v2.0) | Pospuesto (fuera de la v2.0) |
| RF-04 | El Panel de Administración (CMS) debe permitir al personal de secretaría crear, editar y eliminar secciones de contenido dinámico (avisos, "Quiénes somos", comunidades, grupos pastorales) sin intervención del equipo de desarrollo. | Requerimientos Proyecto Parroquia \- Sec.3; Transcripción Audio | Must Have | Implementado |
| RF-05 | El sistema debe permitir incrustar (embed) en el portal videos institucionales alojados en YouTube, con reproducción interna (mini-visualización) y un botón de redirección al canal oficial. | Transcripción Audio (18/ago) | Should Have | Implementado |
| RF-06 | El Panel de Administración debe permitir a la secretaría cargar y gestionar fotografías y boletines parroquiales, validando el tamaño máximo permitido por archivo antes de almacenarlos. | Transcripción Audio (18/ago) | Should Have | Implementado |
| RF-07 | El sistema debe integrar un asistente virtual (bot) para WhatsApp/Web que responda automáticamente consultas frecuentes (requisitos de bautismo, fechas de cursillos prematrimoniales, canales de contacto) las 24 horas del día. | Transcripción Audio (18/ago) | Won't Have (v2.0) | Pospuesto (fuera de la v2.0) |
| RF-08 | El sistema debe registrar y almacenar las consultas recibidas por el asistente virtual fuera del horario de oficina, dejándolas disponibles para que la secretaría las revise el siguiente día hábil. | Transcripción Audio (18/ago) | Won't Have (v2.0) | Pospuesto (fuera de la v2.0) |
| RF-09 | El Portal Web debe mostrar un calendario de próximos eventos parroquiales, retirando de la vista de forma automática los eventos cuya fecha ya haya transcurrido. | Transcripción Audio (18/ago) | Must Have | Implementado |
| RF-10 | El sistema debe permitir enlazar el portal con las redes sociales activas de la parroquia (Facebook, Instagram, TikTok) y con la red institucional de la Arquidiócesis de La Paz / Vicaría Sur. | Requerimientos Proyecto Parroquia \- Sec.2 | Could Have | Implementado parcialmente: cada sede guarda y muestra sus enlaces a redes sociales; no hay integración por API con Meta. [COMPLETAR: confirmar con la parroquia si el enlace a la Arquidiócesis / Vicaría Sur se cargará como red o página] |
| RF-11 | El sistema debe controlar el acceso al Panel de Administración mediante autenticación basada en roles y tokens JWT, restringiendo las funciones disponibles según el perfil del usuario (secretaría, párroco, equipo de marketing). | ADR-02; Diagrama C3 \- Componentes | Must Have | Implementado |
| RF-12 | El sistema debe permitir sincronizar los eventos del calendario parroquial con Microsoft 365 (Microsoft Graph Calendar) utilizando el tenant institucional de la parroquia. | Transcripción Audio (18/ago) | Won't Have (v2.0) | Pospuesto (fuera de la v2.0) |
| RF-13 | El Portal Web debe presentar contenido diferenciado por sede (Parroquia Señor de la Exaltación, Parroquia de la Resurrección y capillas dependientes) bajo el dominio institucional pasionistas.org.bo. | Requerimientos Proyecto Parroquia \- Sec.1 | Should Have | Implementado |
| RF-14 | El sistema no incluirá un módulo de donaciones o pagos en línea, debido al costo por comisiones de las pasarelas de pago identificado durante el relevamiento. | Transcripción Audio (18/ago) | Won't Have | Fuera de alcance |

### **2.1 Requisitos pospuestos (fuera de la versión 2.0)**

Se verificó en el código del repositorio que estos requisitos no están implementados:

| ID | Verificación en el código | Motivo |
| ----- | ----- | ----- |
| RF-03 | No hay tablas, rutas ni pantallas de partidas sacramentales ni de notas marginales. | Requiere el sistema de sacramentos del Ing. Rivera; se priorizó el portal y el CMS. |
| RF-07 | Las tablas `conversacion_bot` y `mensaje_bot` existen en el esquema base, pero ningún código del backend ni del frontend las usa. | Depende de la decisión de la parroquia sobre costo y viabilidad (WhatsApp Business API). |
| RF-08 | Igual que RF-07. | Depende de RF-07. |
| RF-12 | Solo existe la columna `evento.id_externo_m365`, que la API devuelve, sin ninguna sincronización con Microsoft Graph. | Depende del acceso al tenant de Microsoft 365 de la parroquia. |

&nbsp;

# **3\. Requisitos No Funcionales (RNF)**

Los requisitos no funcionales especifican atributos de calidad del sistema, redactados de forma cuantitativa y medible conforme a Sommerville e ISO 29148\.

| ID | Atributo | Descripción del RNF | Métrica de Verificación | Prioridad | Estado v2.0 |
| ----- | ----- | ----- | ----- | ----- | ----- |
| RNF-01 | Rendimiento | Las consultas públicas de datos semi-estáticos (horarios, avisos, proclamas vigentes) resueltas mediante caché deben responder en ≤ 5 ms; las consultas no cacheadas contra PostgreSQL no deben exceder 2 s de tiempo de respuesta en el 95% de los casos. | Prueba de carga asíncrona sobre el endpoint cacheado y no cacheado | Must Have | Implementado (caché); [COMPLETAR: resultado de la prueba de carga, no ejecutada] |
| RNF-02 | Seguridad | Toda comunicación entre el Frontend (Portal/Panel) y la API Backend debe cifrarse mediante HTTPS (TLS); el Panel de Administración debe exigir autenticación JWT con expiración de sesión configurable y las contraseñas deben almacenarse con hashing seguro (bcrypt/argon2). | Inspección de tráfico de red y prueba de penetración básica (OWASP) | Must Have | Implementado (JWT, argon2, expiración); HTTPS pendiente del servidor definitivo |
| RNF-03 | Disponibilidad | El Portal Web público debe mantener una disponibilidad mensual ≥ 99%, considerando las restricciones de infraestructura (servidores UCB o nube gratuita/económica) descritas en el relevamiento. | Monitoreo de uptime durante 30 días continuos | Should Have | Pendiente del hosting definitivo |
| RNF-04 | Usabilidad | El personal de secretaría, sin perfil técnico, debe poder publicar un aviso, boletín o evento en el CMS en un máximo de 3 pasos y 2 minutos, sin necesidad de capacitación técnica adicional. | Prueba de usabilidad con usuario representativo (secretaría) y cronometraje de tarea | Must Have | Implementado; [COMPLETAR: resultado de la prueba de usabilidad con la secretaría] |
| RNF-05 | Mantenibilidad (Almacenamiento) | El almacenamiento multimedia debe soportar hasta 50 GB totales, admitiendo fotografías de hasta 30 MB y videos en alta calidad de hasta 2 GB por archivo, sin requerir cambios de arquitectura al ampliar el plan. | Inspección de configuración del servicio de almacenamiento en la nube | Should Have | Implementado parcialmente: límites por archivo cumplidos; la capacidad está configurada en 20 GB (capa gratuita de OCI, ver ADR-04) |
| RNF-06 | Mantenibilidad (CMS) | Las secciones de contenido dinámico del CMS deben poder modificarse mediante columnas JSONB indexadas, sin requerir despliegue de código ni migraciones DDL recurrentes. | Prueba funcional de alta/edición de un bloque de contenido sin despliegue | Must Have | Implementado |

*Nota v1.1:* en RNF-06 se retira la mención a las notas marginales, que pasan a estar pospuestas junto con RF-03.

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

# **5\. Trazabilidad**

La matriz de trazabilidad bidireccional se mantiene en `docs/trazabilidad/Matriz_Trazabilidad.md`.
