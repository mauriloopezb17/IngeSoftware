// Invalidación de la caché de lecturas públicas cuando el CMS modifica contenido (ADR-02).
// Un solo módulo para todos los recursos: la tabla RECURSOS_POR_ENTIDAD dice qué lecturas públicas
// se ven afectadas cuando cambia una entidad (el nombre de la tabla, igual que en la bitácora).
//
// Cómo se dispara: toda modificación del panel se registra con registrarCambio (bitacora.service),
// y este llama a programarInvalidacion. La invalidación NO ocurre en ese momento sino cuando la
// transacción se confirma (db.alConfirmar): invalidar antes del COMMIT dejaría que una lectura
// concurrente volviera a guardar los datos viejos. Si la transacción se deshace, no se invalida.
// Varios cambios de la misma entidad y sede en una transacción (ej. reordenar) invalidan una vez.
//
// Para agregar un recurso nuevo al panel: añadir su entidad a RECURSOS_POR_ENTIDAD. Una entidad
// que no esté en la tabla invalida TODO lo de su sede (más lento, pero nunca deja datos viejos).
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { invalidarRecursos } from './cache.service.js';

const {
  SEDES,
  SEDE,
  HORARIOS,
  SERVICIOS,
  GRUPOS,
  VIDEOS,
  PUBLICACIONES,
  EVENTOS,
  PROCLAMAS,
  BOLETINES,
  PAGINAS,
} = RECURSOS_CACHE;

// Recursos de la sede que cambian con cada entidad. "global": recursos sin sede (lista de sedes y
// resolución del slug). Un arreglo vacío significa que esa entidad no se ve en el portal.
export const RECURSOS_POR_ENTIDAD = Object.freeze({
  publicacion: { sede: [PUBLICACIONES] },
  evento: { sede: [EVENTOS] },
  horario: { sede: [HORARIOS] },
  servicio: { sede: [SERVICIOS] },
  pregunta_frecuente: { sede: [SERVICIOS] },
  grupo_pastoral: { sede: [GRUPOS] },
  video: { sede: [VIDEOS] },
  pagina: { sede: [PAGINAS] },
  bloque: { sede: [PAGINAS] },
  proclama: { sede: [PROCLAMAS] },
  boletin: { sede: [BOLETINES] },
  // Datos, contacto, portada y redes de la sede, y la lista y resolución del slug de las sedes
  // (crear, renombrar, cambiar el slug o desactivar una sede afecta a todas sus rutas).
  sede: { sede: [SEDE], global: [SEDES] },
  sede_red_social: { sede: [SEDE] },
  // El texto alternativo de un archivo se muestra en todo lo que lo usa como imagen o archivo.
  archivo_multimedia: {
    sede: [PUBLICACIONES, EVENTOS, GRUPOS, BOLETINES, SEDE],
    global: [SEDES],
  },
  // Los usuarios no aparecen en ninguna lectura pública.
  usuario: { sede: [] },
});

// Id de la sede de una fila de la bitácora: la propia sede tiene "id"; lo demás, "sede_id".
function sedeDeLaFila(entidad, fila) {
  const sedeId = entidad === 'sede' ? fila?.id : fila?.sede_id;
  return Number.isInteger(sedeId) ? sedeId : null;
}

// Qué invalidar para un cambio: [{ sedeId, recursos }] (sedeId null: recursos globales).
export function invalidacionesDe(entidad, anterior, nuevo) {
  const sedes = new Set(
    [sedeDeLaFila(entidad, anterior), sedeDeLaFila(entidad, nuevo)].filter((id) => id !== null),
  );
  const reglas = RECURSOS_POR_ENTIDAD[entidad];

  if (!reglas) {
    // Entidad desconocida: todo lo de su sede, y lo global por si acaso.
    return [...sedes, null].map((sedeId) => ({ sedeId, recursos: Object.values(RECURSOS_CACHE) }));
  }

  const lista = [...sedes].map((sedeId) => ({ sedeId, recursos: reglas.sede }));
  if (reglas.global?.length > 0) lista.push({ sedeId: null, recursos: reglas.global });
  return lista.filter(({ recursos }) => recursos.length > 0);
}

// Programa la invalidación de un cambio. "db" es el de la transacción ({ consultar, alConfirmar }):
// la invalidación corre al confirmarse. Sin transacción (db sin alConfirmar, ej. un script), el
// cambio ya está confirmado y se invalida de inmediato. Nunca lanza.
export async function programarInvalidacion(db, { entidad, anterior, nuevo }) {
  for (const { sedeId, recursos } of invalidacionesDe(entidad, anterior, nuevo)) {
    const tarea = () => invalidarRecursos(sedeId, recursos);
    if (typeof db?.alConfirmar === 'function') {
      db.alConfirmar(`${entidad}:${sedeId ?? 'global'}`, tarea);
    } else {
      await tarea();
    }
  }
}
