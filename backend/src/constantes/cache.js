// Caché de lecturas públicas en Redis (ADR-02, cache-aside). Contrato: docs/api/convenciones.md.
//
// Qué se guarda: la respuesta ya armada de cada endpoint público de /api/sedes/... , por sede y
// recurso. Cuando el CMS modifica un recurso se invalida (services/cache.service.js), así que el
// portal ve el cambio de inmediato; el TTL solo acota lo que no depende de un cambio del CMS.

// Recursos que se guardan. Cada uno se invalida por separado (sede + recurso).
export const RECURSOS_CACHE = Object.freeze({
  SEDES: 'sedes', // lista de sedes y resolución del slug de la sede (global, sin sede)
  SEDE: 'sede', // GET /api/sedes/:sede
  HORARIOS: 'horarios',
  SERVICIOS: 'servicios', // lista y detalle por slug
  GRUPOS: 'grupos',
  VIDEOS: 'videos',
  PUBLICACIONES: 'publicaciones', // lista y detalle por slug
  EVENTOS: 'eventos',
  PROCLAMAS: 'proclamas', // vigentes e historial
  BOLETINES: 'boletines',
  PAGINAS: 'paginas', // menú y detalle por slug
});

// TTL (segundos) de cada recurso. Es el tope de antigüedad de una respuesta guardada:
//  * Lo que solo cambia cuando el CMS lo modifica (la invalidación ya lo renueva) vive 10 minutos.
//  * Lo que además depende del reloj vive 60 segundos, porque no hay ningún proceso programado:
//    una publicación programada, una que expira, un evento que termina o una proclama cuya boda
//    pasa cambian de estado solos, y la caché podría tardar hasta este tiempo en reflejarlo.
const DIEZ_MINUTOS = 10 * 60;
const UN_MINUTO = 60;

export const TTL_SEGUNDOS = Object.freeze({
  [RECURSOS_CACHE.SEDES]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.SEDE]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.HORARIOS]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.SERVICIOS]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.GRUPOS]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.VIDEOS]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.PUBLICACIONES]: UN_MINUTO,
  [RECURSOS_CACHE.EVENTOS]: UN_MINUTO,
  [RECURSOS_CACHE.PROCLAMAS]: UN_MINUTO,
  [RECURSOS_CACHE.BOLETINES]: DIEZ_MINUTOS,
  [RECURSOS_CACHE.PAGINAS]: DIEZ_MINUTOS,
});

// Todas las claves de la caché empiezan así. Subir la versión descarta de golpe todo lo guardado
// (útil si cambia la forma de las respuestas).
export const PREFIJO_CACHE = 'cache:v1';
