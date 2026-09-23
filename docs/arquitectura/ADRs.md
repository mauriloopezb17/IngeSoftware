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