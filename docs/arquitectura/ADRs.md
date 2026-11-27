# Registro de Decisiones de Arquitectura (ADR)
**Proyecto:** Plataforma Web y Sistema de Gestión Parroquial  
**Organización:** Parroquia Señor de la Exaltación (Pasionistas)  
**Materia / Entorno:** SIS-213 - Ingeniería de Software (UCB)  
**Estado General:** Aprobado  

---

## ADR 01: Adopción de PostgreSQL con soporte para tipos semiestructurados (`JSONB`) en la gestión del CMS y Actas Sacramentales

### Estado
**Aprobado**

### Contexto
La Parroquia Señor de la Exaltación requiere un sistema que resuelva dos desafíos estructurales contrastantes a nivel de persistencia de datos:
1. **Rigor e Integridad Relacional:** Se debe administrar el registro sacramental (bautizos, confirmaciones, matrimonios y proclamas matrimoniales). Un requerimiento crítico no resuelto por el sistema previo del Ing. Rivera es el registro auditado de **notas marginales** en las partidas de bautismo (tales como matrimonios posteriores, nulidades canónicas u ordenaciones sacerdotales), además de conservar el historial legal público de las proclamas matrimoniales. Estos datos exigen integridad referencial estricta, conformidad ACID y garantías canónico-legales.
2. **Flexibilidad Dinámica de Contenidos (CMS Parroquial):** La secretaría requiere actualizar avisos, noticias, boletines, secciones personalizables ("Quiénes somos", comunidades, grupos pastorales) y enlaces multimedia (videos embebidos de YouTube, fotos del dron) sin depender del equipo de desarrollo ni verse restringidos por un esquema de tablas monolítico e inflexible.

La arquitectura requiere un motor unificado que evite la complejidad y sobrecosto de mantener simultáneamente dos motores de base de datos (uno SQL y otro NoSQL) en un entorno de infraestructura acotado (servidores UCB / instancias de bajo costo en la nube).

### Alternativas Consideradas
* **Alternativa A: Enfoque Relacional Puro (MySQL / MariaDB tradicional con esquemas fijos EAV - Entity-Attribute-Value):**  
  * *Ventajas:* Garantiza atomicidad y estructura relacional común.  
  * *Desventajas:* Modelar atributos dinámicos para los bloques del CMS mediante el patrón EAV o múltiples tablas puente genera un desempeño deficiente en consultas complejas (JOINs excesivos) y una alta rigidez ante cambios de diseño.
* **Alternativa B: Base de Datos NoSQL Documental Exclusiva (MongoDB):**  
  * *Ventajas:* Alta flexibilidad para almacenar esquemas variables del CMS y notas marginales en documentos JSON.  
  * *Desventajas:* Pérdida de integridad referencial nativa entre libros sacramentales, actas, partidas y usuarios del sistema; mayor riesgo de inconsistencias transaccionales al actualizar registros con validez legal/eclesiástica.
* **Alternativa C: PostgreSQL Relacional con columnas nativas `JSONB` (Híbrido Relacional/Documental):**  
  * *Ventajas:* Permite modelar entidades críticas fuertemente tipadas mediante tablas relacionales con claves foráneas, restricciones de unicidad e índices transaccionales ACID, al tiempo que permite usar columnas de tipo `JSONB` indexadas con GIN (*Generalized Inverted Index*) para los bloques polimórficos del CMS y las notas marginales dinámicas.

### Decisión
Se decide adoptar **PostgreSQL** como el motor de base de datos relacional principal del sistema, utilizando tipos de datos complejos semiestructurados **`JSONB`** para la persistencia de las secciones configurables del CMS y la bitácora flexible de notas marginales.

### Consecuencias
* **Positivas:**
  * **Motor unificado:** Se elimina la necesidad de operar una base de datos NoSQL separada, reduciendo la superficie operativa, el consumo de memoria en el servidor y los costos de mantenimiento.
  * **Integridad y flexibilidad combinadas:** Las actas sacramentales se mantienen seguras bajo transacciones ACID y llaves foráneas estrictas, mientras que los bloques de contenido (CMS) y metadatos complementarios pueden evolucionar sin necesidad de ejecutar migraciones DDL recurrentes.
  * **Indexación y rendimiento:** El operador `JSONB` en PostgreSQL almacena datos binarios descompuestos, permitiendo búsquedas rápidas mediante índices GIN y operadores de contención (`@>`, `?`, `->>`).
* **Negativas / Mitigaciones:**
  * **Validación a nivel de aplicación:** Los esquemas semiestructurados dentro del JSONB no se validan por defecto a nivel de motor de datos. Se mitiga implementando esquemas de validación estrictos en la API de Node.js/Backend (mediante bibliotecas como Zod o Joi) antes de persistir cualquier mutación.

---

## ADR 02: Implementación de Redis como Capa de Caché en Memoria para Contenido Frecuente y Control de Sesiones

### Estado
**Aprobado**

### Contexto
Durante el relevamiento técnico y el análisis de los procesos operativos de la parroquia, se evidenciaron patrones de consulta recurrentes con baja tasa de mutación:
1. **Consultas Públicas de Alta Frecuencia:** El portal para feligreses atiende solicitudes constantes sobre información estática o semi-estática: horarios fijos de misas, datos institucionales del párroco y despacho, boletines parroquiales y fechas de proclamas matrimoniales vigentes.
2. **Asistente Virtual / Bot 24/7:** La integración del bot libre nocturno para WhatsApp/web genera múltiples peticiones de lectura repetitivas (respuestas automáticas sobre requisitos de bautismo, fechas de cursillos pre-matrimoniales y canales de contacto).
3. **Restricción de Recursos:** El hosting se proyecta sobre servidores universitarios (UCB) o entornos gratuitos/económicos en la nube con límites de CPU, memoria y cuotas de transferencia. Ejecutar consultas directas a PostgreSQL por cada visita o interacción del bot introduce sobrecarga y saturación innecesaria en el pool de conexiones.

### Alternativas Consideradas
* **Alternativa A: Consultas Directas a Base de Datos con Pool Estándar (Sin Caché):**  
  * *Ventajas:* Cero complejidad de infraestructura; consistencia inmediata de los datos.  
  * *Desventajas:* Sobrecarga del motor relacional con lecturas redundantes; incremento de latencia en la carga del portal web y riesgo de degradación del servicio ante picos de concurrencia en fechas litúrgicas clave (ej. Semana Santa, fiesta patronal).
* **Alternativa B: Caché en Memoria Local del Proceso Backend (In-Memory Cache vía Node.js/Python):**  
  * *Ventajas:* No requiere dependencias de infraestructura externa.  
  * *Desventajas:* Si se escala horizontalmente la aplicación o se reinicia el contenedor de backend, la caché se invalida o se desincroniza entre instancias; no permite compartir el estado con procesos auxiliares (ej. worker del bot o cron jobs).
* **Alternativa C: Servidor de Caché en Memoria Dedicado con Redis:**  
  * *Ventajas:* Almacenamiento clave-valor en memoria RAM con tiempos de respuesta en submilisegundos, soporte nativo de TTL (*Time-To-Live*), estrategias de invalidación explícita mediante pub/sub o claves versionadas, y capacidad para almacenar sesiones JWT y control de cuotas (*rate limiting*).

### Decisión
Se decide implementar **Redis** como middleware de caché en memoria de alta velocidad entre la capa de Lógica de Negocio (Backend REST API) y la Capa de Persistencia (PostgreSQL).

Se aplicará el patrón **Cache-Aside (Lazy Loading)** para:
* Datos semi-estáticos del portal (horarios de misas, "Quiénes somos", proclamas matrimoniales vigentes).
* Respuestas frecuentes y menús de decisión del Asistente Virtual / Bot 24/7.
* Lista de eventos del calendario parroquial próximo.

### Consecuencias
* **Positivas:**
  * **Latencia reducida:** Las consultas frecuentes se resuelven en el orden de $\le 5\text{ ms}$, mejorando significativamente la experiencia del usuario final en dispositivos móviles.
  * **Protección de PostgreSQL:** Se descarga hasta un 70% del volumen de lectura que recibiría el motor relacional, preservando recursos computacionales para transacciones críticas (inscripción sacramental, emisión de certificados y actas).
  * **Capacidad extendida:** Permite utilizar Redis como almacén de sesiones volátiles y para implementar mecanismos de *rate limiting* que protejan al portal de abusos o ataques de denegación de servicio.
* **Negativas / Mitigaciones:**
  * **Riesgo de inconsistencia temporal (Stale Data):** Un cambio en los horarios o en el calendario realizado por la secretaría podría tardar en reflejarse si la caché no expira. Se mitiga implementando invalidación activa de llaves específicas (`cache invalidation`) en los controladores de mutación (POST/PUT/DELETE) del backend, complementado con un TTL prudente (ej. $15$ a $30\text{ minutos}$).
  * **Componente adicional en el despliegue:** Requiere aprovisionar y monitorear un servicio Redis (mediante Docker Compose en el servidor UCB o servicio gestionado tipo Redis Cloud).

---

## ADR 03: Stack Node.js/Express + PostgreSQL frente al stack de referencia de la materia (.NET 8 + SQL Server 2022 + xUnit/Moq + Flutter/Web)

### Estado
**Aprobado** (registrado en el Sprint 3, con la decisión ya implementada desde el Sprint 1)

### Contexto
El formulario de auditoría de la materia SIS-213 toma como referencia un stack concreto: un proyecto de base de datos `.sqlproj` de SQL Server 2022, una Web API en .NET 8 con Controllers, Services y documentación Swagger, pruebas unitarias con xUnit y Moq, y un cliente Flutter/Web. El equipo construyó el sistema con otro stack, y la auditoría necesita saber por qué y dónde está cada pieza equivalente.

Antecedentes:
1. **ADR-01** eligió PostgreSQL con columnas `JSONB` para combinar integridad relacional con contenido flexible del CMS (bloques de BlockNote y bloques de página).
2. **ADR-02** eligió Redis como caché cache-aside y almacén de contadores para el límite de intentos.
3. En la entrevista con la parroquia (Acta N.° 01, `docs/entrevistas/`) el responsable de infraestructura recomendó frameworks JavaScript (Vue/React) frente a un CMS rígido, y el hosting previsto son servidores de la UCB o una nube gratuita o económica.

### Alternativas Consideradas
* **Alternativa A: Stack de referencia (.NET 8 Web API + SQL Server 2022 + xUnit/Moq + Flutter/Web):**
  * *Ventajas:* Coincide literalmente con el formulario de auditoría; tipado estático en C#; Swagger generado automáticamente.
  * *Desventajas:* SQL Server no tiene un tipo equivalente a `JSONB` indexable con GIN (guarda JSON como texto `NVARCHAR` y lo consulta con funciones), lo que contradice el ADR-01; la licencia y los requisitos de memoria de SQL Server encarecen el hosting fuera de la capa gratuita; dos lenguajes (C# en el servidor y Dart en el cliente) para un equipo de tres personas; Flutter Web genera una aplicación pesada para un portal público que debe cargar rápido en celulares.
* **Alternativa B: Node.js 22 + Express 5 + PostgreSQL 16 + Vitest + React (stack elegido):**
  * *Ventajas:* Un solo lenguaje (JavaScript) en el backend, el frontend y las pruebas; `JSONB` nativo; todo el stack es de código abierto y corre en contenedores sin licencias.
  * *Desventajas:* Se aparta del stack de referencia del curso; JavaScript no tiene tipado estático.
* **Alternativa C: CMS existente (WordPress u otro):**
  * *Ventajas:* Panel de administración listo.
  * *Desventajas:* Descartado en la entrevista con la parroquia por rigidez, compatibilidad de integraciones y animaciones.

### Decisión
Se adopta **Node.js 22 con Express 5** para la API REST, **PostgreSQL 16** como base de datos, **Vitest** (con Supertest) para las pruebas del backend y **React 19** (con Vite) para el cliente web. Cada pieza del stack de referencia tiene un equivalente verificable en el repositorio:

| Stack de referencia | Equivalente en el repositorio | Dónde verificarlo |
|---|---|---|
| Proyecto de base de datos `.sqlproj` (SQL Server 2022) | Esquema base en SQL, migraciones numeradas y datos iniciales; un único script los aplica en orden | `database/db_portal_cms.sql`, `database/migrations/001_…sql` a `015_…sql`, `database/seed/`, `database/docker/00-iniciar-portal-cms.sh` (lo usan `docker-compose.yml` y el CI) |
| Web API .NET 8 con Controllers y Services | API REST en Express 5 con la cadena routes → middlewares → controllers → services → models | `backend/src/routes/`, `backend/src/middlewares/`, `backend/src/controllers/`, `backend/src/services/`, `backend/src/models/` |
| Validación con Data Annotations | Esquemas Zod por endpoint, aplicados por un middleware | `backend/src/validacion/`, `backend/src/middlewares/validar.js` |
| Swagger / OpenAPI | Contrato de la API en Markdown con ejemplos JSON; las pruebas comparan las respuestas reales con esos ejemplos | `docs/api/` (contrato), `backend/tests/apoyo/contrato.js` |
| xUnit | Vitest | `backend/vitest.config.js`, `backend/tests/unit/` (29 archivos) y `backend/tests/integracion/` (59 archivos) |
| Moq | `vi.mock`, `vi.spyOn` y `vi.stubEnv` de Vitest; `aws-sdk-client-mock` para el cliente S3 | Por ejemplo `backend/tests/unit/admin-usuarios.test.js`, `backend/tests/unit/cache-redis-caido.test.js`, `backend/tests/unit/almacenamiento.test.js` |
| Pruebas de integración con `WebApplicationFactory` | Supertest contra la aplicación Express real, con PostgreSQL 16 y Redis 7 reales en el CI | `backend/src/app.js` (`createApp`, sin escuchar puerto), `backend/tests/integracion/`, job `backend` de `.github/workflows/ci.yml` |
| Cliente Flutter/Web | SPA en React 19 con Vite (portal público y panel CMS en `/admin`); pruebas con Vitest y Testing Library, y de punta a punta con Playwright | `frontend/src/`, `frontend/e2e/`, `frontend/playwright.config.js` |
| Transacciones ACID (`TransactionScope` / `BeginTransaction`) | Helper `transaccion(fn)`: `BEGIN`, `COMMIT` si `fn` termina bien y `ROLLBACK` si lanza un error; `alConfirmar` ejecuta tareas solo después del `COMMIT` (invalidar la caché) | `backend/src/db/index.js` (función `transaccion`). La usan los servicios de escritura del panel: `adminBoletines`, `adminEventos`, `adminGrupos`, `adminHorarios`, `adminPaginas`, `adminProclamas`, `adminPublicaciones`, `adminSedes`, `adminServicios`, `adminUsuarios`, `adminVideos`, `auth`, `biblioteca`, `bitacora`, `estadoPublicaciones`, `multimedia` y `observacionesProclama` (todos en `backend/src/services/`), además de `backend/src/models/usuarios.model.js` y `backend/src/utils/adminContenido.js`. Cada cambio y su registro en la bitácora se guardan en la misma transacción. |
| Migraciones transaccionales | Cada migración SQL va envuelta en `BEGIN; … COMMIT;` | `database/migrations/*.sql` |

### Consecuencias
* **Positivas:**
  * **`JSONB` nativo:** el contenido de las publicaciones y los bloques de página se guardan y validan sin crear tablas por cada tipo de bloque (ADR-01).
  * **Un solo lenguaje:** los tres integrantes trabajan en JavaScript en el backend, el frontend y las pruebas, y pueden revisarse los pull requests entre sí.
  * **Experiencia del equipo:** el equipo ya conocía JavaScript y React, lo que permitió entregar el prototipo en el primer mes, como se acordó con la parroquia.
  * **Costo de hosting:** PostgreSQL, Redis y Node.js son de código abierto y corren en contenedores sin licencias, compatibles con los servidores de la UCB o una nube gratuita o económica.
* **Negativas / Mitigaciones:**
  * **Diferencia con el estándar del curso:** el formulario de auditoría espera artefactos concretos (`.sqlproj`, Swagger, xUnit/Moq, Flutter). Se mitiga con la tabla de equivalencias de este ADR, que señala para cada artefacto su archivo equivalente en el repositorio.
  * **Sin tipado estático:** JavaScript no detecta errores de tipo al compilar. Se mitiga con validación Zod en cada entrada de la API y de las variables de entorno (`backend/src/config/entorno.js`), ESLint y Prettier en el CI, y pruebas automatizadas de unidad, integración y e2e.
  * **Sin documentación interactiva generada:** no hay una interfaz Swagger para probar la API. Se mitiga manteniendo el contrato de `docs/api/` como fuente de verdad, verificado por las pruebas.

---

## ADR 04: Almacenamiento multimedia en Oracle Cloud Infrastructure Object Storage (API compatible con S3)

### Estado
**Aprobado** (registrado en el Sprint 3, con la decisión ya implementada en el Sprint 2)

### Contexto
La parroquia necesita publicar fotografías, boletines en PDF y videos institucionales. El relevamiento fijó el requisito **RNF-05**: hasta 50 GB de almacenamiento, fotografías de hasta 30 MB y videos de hasta 2 GB por archivo, sin cambiar la arquitectura al ampliar el plan. En la entrevista se señaló que los videos pueden enlazarse desde YouTube para no ocupar espacio, y que el hosting será de bajo costo (servidores de la UCB o una nube gratuita o económica).

Guardar archivos binarios en PostgreSQL inflaría la base y sus respaldos, y servirlos desde la API consumiría el ancho de banda y la memoria del servidor.

### Alternativas Consideradas
* **Alternativa A: Disco local del servidor de la API:**
  * *Ventajas:* Sin servicios externos ni credenciales.
  * *Desventajas:* El espacio depende del servidor que se elija (aún no definido); los archivos se pierden si el contenedor o el servidor se reemplaza; no escala a varias instancias; la API tendría que servir los archivos ella misma.
* **Alternativa B: Otro proveedor compatible con S3 (por ejemplo Amazon S3):**
  * *Ventajas:* Mismo código, porque el cliente usa la API S3.
  * *Desventajas:* no aporta ninguna ventaja técnica frente a OCI, porque el código sería el mismo, y obligaría a abrir y pagar otra cuenta cuando la de OCI ya estaba en uso desde el Sprint 2 (PR #22, multimedia en Oracle Cloud). Sigue disponible como plan de salida: basta con cambiar las variables de entorno.
* **Alternativa C: Almacenamiento de la UCB:**
  * *Ventajas:* Sin costo para la parroquia.
  * *Desventajas:* al cierre de la versión 2.0 no existe un acuerdo de alojamiento con la UCB; el hosting definitivo sigue pendiente de decisión de la parroquia (Segundo Informe de Avance, sección 11), y el sistema no podía esperar esa decisión para guardar archivos.
* **Alternativa D: Oracle Cloud Infrastructure (OCI) Object Storage, con la API compatible con S3 (elegida).**

### Decisión
Se adopta **OCI Object Storage** con su API compatible con S3. La implementación:

* **Configuración** (`backend/src/config/entorno.js`): `OCI_S3_ENDPOINT` (URL https), `OCI_S3_REGION`, `OCI_S3_BUCKET_NAME`, `OCI_S3_ACCESS_KEY_ID` y `OCI_S3_SECRET_ACCESS_KEY` se definen todas juntas o ninguna; `CDN_PUBLIC_URL` es la URL pública desde la que se sirven los archivos. Son opcionales: sin ellas la API arranca y solo las operaciones de archivos responden 503.
* **Cliente** (`backend/src/storage/oci.js`): un único `S3Client` de `@aws-sdk/client-s3` con `forcePathStyle` (OCI usa el bucket en la ruta) y sin el checksum CRC32 por defecto, que OCI no admite. Los archivos de 16 MB o más se suben por partes de 8 MB, tres en paralelo (`@aws-sdk/lib-storage`), y si una parte falla no quedan partes huérfanas. Los objetos se guardan con `Cache-Control: public, max-age=31536000, immutable`, porque cada clave lleva un UUID y nunca cambia de contenido. Los fallos del SDK se informan como 503 sin registrar credenciales.
* **Entrega al público:** el bucket es de lectura pública y el portal arma las URLs con `CDN_PUBLIC_URL` + clave; el dominio previsto es `cdn.pasionistas.org.bo`. Las claves siguen el formato `sedes/<slug>/<año>/<mes>/<uuid>.<extensión>`.
* **Validación** (`backend/src/constantes/multimedia.js`, `backend/src/middlewares/recibirArchivo.js`, `backend/src/services/multimedia.service.js`): el archivo se recibe en disco temporal con multer (tope absoluto de 2 GB) y su tipo se detecta por el contenido con `file-type`, no por la extensión. Se aceptan imágenes JPEG, PNG y WebP de hasta 30 MB, videos MP4 y WebM de hasta 2 GB y documentos PDF de hasta 50 MB; no se aceptan SVG ni GIF.
* **Imágenes** (`multimedia.service.js`, con `sharp`): se convierten a WebP (calidad 82), se corrige la orientación, se eliminan todos los metadatos (incluida la ubicación GPS), se limita el lado largo a 2560 px sin ampliar y se rechazan las de más de 268 megapíxeles. Se generan variantes de 480, 960 y 1600 px de ancho (solo las menores que la imagen) para que el portal elija el tamaño según la pantalla.
* **Consistencia:** el archivo se sube primero al bucket y luego se registra en PostgreSQL dentro de una transacción con su bitácora; si el registro falla, se borra lo subido.
* **Capacidad:** la API suma el tamaño de los archivos registrados y deja de aceptar subidas al llegar al 90 % de `CAPACIDAD_ALMACENAMIENTO_BYTES`, fijada en **20 GB**, el tope de la capa gratuita Always Free de OCI según el comentario del código.

### Consecuencias
* **Positivas:**
  * **Límites del RNF-05 por archivo cumplidos:** 30 MB por foto y 2 GB por video, verificados por contenido y no por extensión.
  * **API S3 estándar:** el código no depende de Oracle; cambiar a otro proveedor compatible con S3 solo requiere cambiar las variables `OCI_S3_*` y `CDN_PUBLIC_URL`, sin tocar la arquitectura.
  * **Menos carga en el servidor:** los archivos no pasan por PostgreSQL ni la API los sirve; el navegador los descarga del bucket o del CDN, con caché de un año.
  * **Privacidad y rendimiento:** las fotos publicadas no conservan la ubicación GPS, y las variantes WebP reducen lo que descargan los celulares.
* **Negativas / Mitigaciones:**
  * **Capacidad configurada por debajo del RNF-05:** el código limita el almacenamiento a 20 GB y el requisito pide 50 GB. Se mitiga con el control de capacidad, que avisa y rechaza subidas antes de llenarse, con la recomendación de publicar los videos en YouTube y con la posibilidad de ampliar el plan de OCI y subir la constante `CAPACIDAD_ALMACENAMIENTO_BYTES` sin cambiar la arquitectura. El plan definitivo de OCI y su capacidad los decide la parroquia junto con el hosting definitivo, que sigue pendiente al cierre de la versión 2.0; mientras tanto rige el límite de 20 GB.
  * **Dependencia de un proveedor externo y de credenciales:** si OCI no responde, la subida y el borrado de archivos devuelven 503, pero el resto de la API sigue funcionando. Las credenciales se cargan solo desde el entorno y nunca se registran en los logs.
  * **Cuenta a nombre de un integrante:** hoy la cuenta de OCI es de Mauricio López. Se mitiga con el plan de transferencia de cuentas a la parroquia al cierre del proyecto.