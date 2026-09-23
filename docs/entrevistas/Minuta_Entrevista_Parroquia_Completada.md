**UNIVERSIDAD CATÓLICA BOLIVIANA "SAN PABLO"**  
**DEPARTAMENTO DE INGENIERÍA DE SISTEMAS**  
INGENIERÍA DE SOFTWARE (SIS-213) — SEMESTRE 2/2026  
*Docente: Ing. M. Sc. Miguel Angel Pacheco Arteaga*

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

**PLANTILLA OFICIAL: MINUTA DE ENTREVISTA CON STAKEHOLDERS**  
*Ingeniería de Requisitos bajo Estándar ISO/IEC/IEEE 29148:2018*

**1\. Datos Generales de la Sesión**

| Proyecto: | Plataforma Web y de Gestión – Parroquia Señor de la Exaltación (Pasionistas) –&nbsp; | Acta N°: | 01 |
| :---- | :---- | :---- | :---- |
| **Fecha:** | Jueves 27 de agosto | **Hora:** | 9:00 \- 10:00 |
| **Lugar:** | Presencial / Mixta (parte de la reunión se transfirió por videollamada) | **Duración:** | 1 hora |
| **Entrevistador:** | Ian Coaquira Uriarte | **Cargo:** | Director de Proyecto y Analista de Sistemas&nbsp; |

&nbsp;

**2\. Registro de Participantes**

| Nombre y Apellidos | Rol / Cargo | Organización / Empresa |
| :---- | :---- | :---- |
| Padre Gregorio | Párroco / Stakeholder Principal | Parroquia Señor de la Exaltación (Pasionistas) |
| Luis | Arquitecto / Responsable de infraestructura y Tenant Microsoft | Parroquia Señor de la Exaltación (Pasionistas) |
| Ian | Director de Proyecto y Analista de Sistemas&nbsp; | Equipo de Desarrollo del proyecto |
| Mauricio | Arquitecto de Software y Desarrollador Backend&nbsp; | Equipo de Desarrollo del proyecto |
| Samiel | Especialista en QA (Calidad) y Desarrollador Frontend&nbsp; | Equipo de Desarrollo del proyecto |

**3\. Objetivo y Agenda de la Entrevista**

**3.1 Objetivo de la Entrevista:**

*Establecer un entendimiento mutuo sobre las necesidades del negocio, delimitar el alcance operativo de los procesos analizados (AS-IS) y capturar las expectativas del nuevo sistema de información de forma clara y sin ambigüedades.*

**3.2 Temas de Agenda:**

**1\.** Presentación de la dinámica de trabajo ágil y establecimiento del rol del stakeholder.

**2\.** Mapeo del flujo de procesos actual (AS-IS), herramientas utilizadas y cuellos de botella detectados.

**3\.** Discusión de requisitos funcionales críticos (Must Have) y atributos de calidad de software (No Funcionales).

**4\.** Validación preliminar de expectativas de reportes y mecanismos de control administrativo.

**5\.** Definición de compromisos de revisión de prototipos y próximos pasos del ciclo de requisitos.

**3.3 Análisis AS-IS: Problemas Actuales del Negocio (Resumen)**

Principales problemas identificados en los procesos actuales de la parroquia, recogidos durante la entrevista y el documento de requerimientos del proyecto:

• Registro manual/físico de bautizos y de las proclamas matrimoniales, sin un historial digital centralizado, aunque su publicación y conservación es obligatoria por tema legal. (Fuente: Audio de la reunión – Luis)

• Comunicación con los feligreses dispersa y no automatizada: solo por WhatsApp, Instagram y Facebook, sin atención fuera del horario de oficina de la secretaría. (Fuente: Audio de la reunión – Luis)

• Actualización del calendario de actividades y avisos totalmente manual por parte de la secretaría, sin una herramienta ágil tipo CMS que permita hacerlo sin conocimientos técnicos. (Fuente: Audio de la reunión – Luis)

• Flujo de publicación de contenido (fotos, notas de prensa, boletines) no estandarizado: la información llega por WhatsApp y debe transcribirse manualmente a la web, con riesgo de pérdida de información. (Fuente: Audio de la reunión – Luis)

• Falta de un repositorio centralizado y formal para compartir insumos gráficos (logo, línea gráfica, videos institucionales); actualmente se comparten de manera informal (ej. Google Drive, WhatsApp). (Fuente: Audio de la reunión – Luis)

• El sistema actual de registro de sacramentos (desarrollado por el Ing. Rivera) no permite agregar notas marginales a los registros de bautizo (p. ej. registro posterior de matrimonio, nulidad u ordenación sacerdotal), lo que se identifica como el requerimiento técnico más crítico a corregir. (Fuente: Documento de Requerimientos del Proyecto, Sección 4\)

• No existe una solución de pagos/donaciones en línea; habilitarla implica comisiones por transacción de la pasarela de pago, lo que se percibe como un riesgo a evaluar con cuidado. (Fuente: Audio de la reunión – Luis)

**4\. Cuestionario de Relevamiento de Requisitos (ISO 29148\)**

**Bloque A: Rol y Responsabilidades en la Organización**

**1\. ¿Cuál es su rol oficial en la organización y qué decisiones clave están bajo su directa responsabilidad?**

*Respuesta / Notas de Campo:*  
El Padre Gregorio es el párroco y decide el contenido pastoral (misas, sacramentos, quiénes somos). Luis es el arquitecto/responsable de la infraestructura técnica y gestiona el Tenant de Microsoft de la parroquia. Mauricio, junto al equipo de desarrollo, está a cargo de construir y dar seguimiento técnico a la plataforma.

**2\. ¿Cómo interactúa actualmente con los procesos operativos que el sistema busca automatizar o reemplazar?**

*Respuesta / Notas de Campo:*  
Actualmente la secretaría registra manualmente bautizos y matrimonios, y publica de forma física/manual las proclamas matrimoniales (obligatorias por tema legal) manteniendo un historial. La comunicación con feligreses se hace por WhatsApp, Instagram y Facebook, y la difusión de actividades y notas de prensa se hace de forma manual.

**Bloque B: Diagnóstico del Proceso Actual (Situación AS-IS)**

**3\. ¿Puede describir paso a paso el flujo de trabajo actual para este proceso? (Detallar origen, actores y salidas).**

*Respuesta / Notas de Campo:*  
Los datos de bautizo se registran en el sistema actual (desarrollado por el Ing. Rivera). Las proclamas matrimoniales se publican y se mantiene un historial por requisito legal. Las actividades y avisos se comunican por WhatsApp/redes sociales, y el calendario de eventos se actualiza manualmente por la secretaría, similar a como lo hace un colegio.

**4\. ¿Qué herramientas utiliza hoy en día para gestionar esta información? (Hojas Excel, registros físicos, etc.).**

*Respuesta / Notas de Campo:*  
WhatsApp, Instagram y Facebook para comunicación y avisos; un sistema de registro de sacramentos desarrollado por el Ing. Rivera; Google Drive como repositorio para compartir la línea gráfica, el logo y archivos multimedia; y actualmente no existe un CMS propio para la web.

**5\. ¿Cuánto tiempo promedio toma completar una transacción o tarea clave en las condiciones actuales?**

*Respuesta / Notas de Campo:*  
Aproximadamente toma entre 1 a 2 dias.

**Bloque C: Dolores de Cabeza y Cuellos de Botella**

**6\. ¿Cuáles son los principales dolores, errores frecuentes o retrasos que experimenta en el flujo de trabajo actual?**

*Respuesta / Notas de Campo:*  
El sistema actual de sacramentos no permite agregar notas marginales a los registros de bautizo (por ejemplo, el registro posterior de un matrimonio, una nulidad o una ordenación sacerdotal). Tampoco existe un canal automatizado para atender consultas fuera de horario de oficina (se plantea la posibilidad de un bot). Actualizar el calendario de actividades y las proclamas depende de procesos manuales.

**7\. ¿Qué impacto financiero o de servicio al cliente tienen estos cuellos de botella para la empresa?**

*Respuesta / Notas de Campo:*  
No se cuantifica un impacto financiero o de servicio en el audio; sin embargo, se advierte que habilitar pagos/donaciones en línea implica comisiones por cada transacción de la pasarela de pago (se menciona 'Libera' como la más usada en Bolivia), lo que se identifica como un riesgo a evaluar ('es muy peligroso').

**8\. ¿Qué información vital le resulta difícil o imposible de obtener en tiempo real bajo el modelo actual?**

*Respuesta / Notas de Campo:*  
La posibilidad de agregar notas marginales a una partida de bautismo (matrimonio posterior, nulidad, ordenación sacerdotal) no está disponible en tiempo real en el sistema actual. Asimismo, la información de actividades y horarios no siempre está actualizada de forma inmediata al depender de publicación manual.

**Bloque D: Expectativas de la Solución (Situación TO-BE)**

**9\. ¿Qué funcionalidades específicas o automatizaciones considera que son IMPRESCINDIBLES (Must Have) para el sistema?**

*Respuesta / Notas de Campo:*  
Página principal con secciones fijas: 'Quiénes somos' (descripción de la parroquia y datos del padre), 'Servicios' (sacramentos: bautizos, primera comunión con cursillos, etc.) y 'Grupos/Comunidad'. Publicación automática y con historial de las proclamas matrimoniales. Calendario de eventos dinámico que la secretaría pueda actualizar sin ser técnica (tipo CMS, 'como Word'). Integración con WhatsApp, Instagram y Facebook, incluyendo la posibilidad de un bot de respuesta 24/7. Reproducción de videos institucionales alojados en YouTube. Corrección del sistema de sacramentos para permitir notas marginales en los registros de bautizo.

**10\. ¿Qué atributos de calidad espera del sistema? (Ej: tiempos de respuesta rápidos de las consultas, seguridad, usabilidad).**

*Respuesta / Notas de Campo:*  
Diseño visualmente atractivo y responsive (se tomaron como referencia páginas parroquiales de EE.UU.); fidelidad al logo y línea gráfica institucional, aceptando que el color puede variar ligeramente según la calidad de pantalla; facilidad de actualización de contenido por personal no técnico de secretaría; capacidad de almacenamiento de hasta 50 GB para imágenes y videos (o enlace directo a YouTube para no ocupar espacio); la conexión de internet disponible es de 1 Gbps de bajada y 500 Mbps de subida (línea principal) y 70/70 Mbps (línea 'online').

**11\. ¿Qué reportes gerenciales, gráficos o indicadores (KPIs) necesita que el sistema genere para apoyar su gestión?**

*Respuesta / Notas de Campo:*  
No se detallan reportes gerenciales o KPIs específicos en el audio; el énfasis está en la gestión de contenido (calendario, avisos, proclamas) más que en reportes administrativos.

**Bloque E: Cierre y Factores de Éxito**

**12\. ¿Hay algún otro aspecto normativo, político, técnico o restricción del negocio que debamos considerar?**

*Respuesta / Notas de Campo:*  
El dominio pasionistas.org.bo se gestiona bajo un Tenant de Microsoft de la parroquia (con costo de mantenimiento a revisar con Luis). Como hosting se evalúan dos opciones: los servidores de la Universidad Católica Boliviana (UCB) o una alternativa gratuita en la nube. Se prefiere desarrollar con frameworks JavaScript (Vue/React) en vez de un CMS como WordPress, ya que este último puede dar problemas de compatibilidad con la integración de Google Calendar y es más rígido para animaciones. Se acordó un plazo de un mes para entregar un prototipo funcional; el despliegue final y la publicación dependen de la validación de la secretaría y de la disponibilidad de la plataforma institucional, prevista para noviembre.

**5\. Requisitos Preliminares Identificados**

Mapeo rápido de requisitos preliminares surgidos de la conversación para su posterior registro, análisis detallado e importación formal al backlog de Jira.

| ID Temp | Descripción Preliminar del Requisito | Tipo (RF / RNF) | MoSCoW | Fuente |
| :---- | :---- | :---- | :---- | :---- |
| RF-TEMP-01 | El sistema debe publicar y mantener un historial público de las proclamas matrimoniales | Funcional | Must | Audio de la reunión – Luis |
| RF-TEMP-02 | El sistema debe contar con secciones administrables de 'Quiénes somos', 'Servicios' (sacramentos) y 'Grupos/Comunidad' | Funcional | Must | Audio de la reunión – Luis |
| RF-TEMP-03 | El sistema debe permitir que la secretaría (personal no técnico) actualice el calendario de eventos y avisos sin depender de desarrolladores | Funcional | Must | Audio de la reunión – Luis |
| RF-TEMP-04 | El sistema debe permitir agregar notas marginales a los registros de bautizo (matrimonio posterior, nulidad, ordenación sacerdotal) | Funcional | Must | Documento de Requerimientos (Sección 4\) |
| RF-TEMP-05 | El sistema debe integrar y reproducir videos institucionales alojados en YouTube | Funcional | Should | Audio de la reunión – Luis |
| RF-TEMP-06 | El sistema debe habilitar canales de contacto con WhatsApp, Instagram y Facebook, evaluando un bot de respuesta automática 24/7 | Funcional | Should | Audio de la reunión – Luis |
| RNF-TEMP-01 | El diseño de la web debe respetar la línea gráfica y paleta de colores institucional de la parroquia | Usabilidad | Must | Audio de la reunión – Luis / Álvaro |
| RNF-TEMP-02 | El almacenamiento multimedia (imágenes y videos) debe ajustarse a la capacidad disponible en la nube (hasta 50 GB) | Almacenamiento | Should | Audio de la reunión – Luis |
| RNF-TEMP-03 | La integración con calendarios externos (Google/Microsoft) debe evaluarse por costos y compatibilidad técnica antes de implementarse | Restricción | Could | Audio de la reunión – Luis |

&nbsp;

**6\. Compromisos y Próximos Pasos**

| \# | Acción de Compromiso Acordada | Responsable de Entrega | Fecha Límite |
| :---- | :---- | :---- | :---- |
| 1 | Entregar un prototipo funcional de la plataforma web (página principal y secciones acordadas) | Equipo de Desarrollo (Mauricio, Ian y Samiel) | En 1 mes desde la reunión |
| 2 | Definir y enviar el contenido de 'Quiénes somos', servicios (sacramentos) y grupos/comunidad | Padre Gregorio | En 2 semanas desde la reunión |
| 3 | Enviar el logo, la línea gráfica (colores) y el video institucional (dron) en los formatos requeridos | Álvaro / Equipo de medios | En 1 semana desde la reunión |
| 4 | Compartir los correos del equipo para habilitar un entorno colaborativo (tipo Drive) de seguimiento del proyecto | Todos los participantes | En 1 semana desde la reunión |
| 5 | Definir infraestructura de hosting (UCB vs. alternativa gratuita) y accesos al Tenant de Microsoft | Luis | En 1 mes desde la reunión |

&nbsp;

&nbsp;

**7\. Anexo: Preguntas Extra (Diálogo Entrevistador–Stakeholder)**

Extractos representativos del audio principal de la reunión. Las intervenciones se presentan de forma resumida/fiel al audio original para facilitar su lectura.

**Proclamas matrimoniales y bautizos**

*Entrevistador: ¿Los bautizos, los matrimoniales, ese tipo de cosas?*

Luis: Las proclamas son las proclamas matrimoniales... es importante por un tema legal tenerlas publicadas y mantener un historial de esto.

**Bot de atención 24/7**

*Entrevistador: ¿Habrá la posibilidad de implementar algún bot libre por ahí?*

Luis: Sí se podría hacer... sería interesante que pueda responder en la noche o mantener los mensajes activos, como un asistente 24/7, y al día siguiente esa información ya estaría para que la lea la secretaria.

**Integración con calendario (Google vs. Microsoft)**

*Entrevistador: ¿Mediante una API se podría hacer una integración con el calendario de Google?*

Luis: Sí se puede, pero el problema es que nos piden varios requisitos y no sé si es gratuito... tal vez sea más accesible con el calendario de Microsoft, ya que tenemos el tenant de Microsoft de la parroquia.

**Almacenamiento de videos e imágenes**

*Entrevistador: ¿Cuántos videos recomiendan ustedes en este caso?*

Luis: Eso depende de dónde lo vamos a almacenar... hay versiones gratuitas en la nube donde tenemos hasta 50 GB para almacenar... si es de YouTube entonces ahí ya no pesa nada.

**Estructura de la página principal**

*Entrevistador: (sobre cómo organizar la web)*

Luis: Te sugiero primero empezar con la página principal... botón uno de quiénes somos, el segundo de servicios (el tema de los sacramentos), y el tercero qué grupos compone la comunidad.

**Actualización del calendario tipo CMS (ejemplo de referencia)**

*Luis (mostrando el ejemplo de otra parroquia):*

“Esa página solita se va renovando y lo que hace la persona en la secretaría es solamente actualizar, se actualiza, nada más pone la actividad.”

**Donaciones / pagos en línea**

*Entrevistador: ¿Se refiere a una posibilidad de pagar por la página, que la gente done a la iglesia?*

Luis: Sí se puede hacer, pero pasan dos cositas: la pasarela de pago siempre cobra comisiones. Aquí en Bolivia se usa más el Libera... pero te cobran comisiones por cada transacción.

**Elección de tecnología (frameworks vs. CMS)**

*Entrevistador: ¿Con qué han trabajado ustedes alguna vez?*

Luis: Los trabajos de la U siempre han sido en JavaScript, los típicos frameworks, Vue, React... es muchísimo más flexible. En cambio, con WordPress la integración con Google Calendar puede dar problemas porque no es tan compatible.

**Plazos de entrega**

*Entrevistador: ¿Le parece un mes o un mes y medio para entregar todo esto, para el prototipo?*

Luis: El prototipo se puede hacer en un mes sin problemas. El problema es el despliegue... eso es lo que vamos a hacer, en un mes le entrego el prototipo.

&nbsp;