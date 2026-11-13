// Biblioteca multimedia: listar, ver, editar y eliminar archivos (contrato: docs/api/admin.md, sección 2).
import { ANCHOS_VARIANTES, claveDeVariante } from '../constantes/multimedia.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/biblioteca.model.js';
import { eliminarObjetos } from '../storage/oci.js';
import { esAdministrador, exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { patronBusqueda } from '../utils/busqueda.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { aArchivoMultimedia } from './multimedia.service.js';

const MENSAJE_SOLO_LO_PROPIO = 'Solo puedes eliminar los archivos que tú subiste.';
const MENSAJE_EN_USO = 'El archivo está en uso y no se puede eliminar.';
// Cuántos usos se detallan en el 409; el resto se resume en «Y N usos más.».
const USOS_DETALLADOS = 5;

// Archivo por id con la restricción de sede (403 si es de otra sede, 404 si no existe).
async function archivoDelUsuario(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El archivo no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

// consulta: { sede (ya restringida por sede), clase, buscar, enUso, orden, pagina, porPagina }.
export async function listarArchivos(sedeFiltro, consulta) {
  const { pagina, porPagina } = consulta;
  const orden = consulta.orden ?? '-fechaSubida';

  const { filas, total } = await modelo.listar(
    {
      sedeSlug: sedeFiltro,
      clase: consulta.clase,
      patron: consulta.buscar ? patronBusqueda(consulta.buscar) : undefined,
      enUso: consulta.enUso,
    },
    {
      limite: porPagina,
      desplazamiento: desplazamiento(pagina, porPagina),
      campo: orden.replace(/^-/, ''),
      ascendente: !orden.startsWith('-'),
    },
  );

  return {
    datos: filas.map(aArchivoMultimedia),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
}

export async function obtenerArchivo(usuario, id) {
  return aArchivoMultimedia(await archivoDelUsuario(usuario, id));
}

export async function actualizarArchivo(usuario, id, { textoAlternativo }) {
  await archivoDelUsuario(usuario, id);
  return aArchivoMultimedia(await modelo.actualizarTextoAlternativo(id, textoAlternativo));
}

const DESCRIPCION_DE_USO = {
  PORTADA_PUBLICACION: (nombre) => `Usado como portada de la publicación «${nombre}».`,
  IMAGEN_EVENTO: (nombre) => `Usado como imagen del evento «${nombre}».`,
  IMAGEN_GRUPO: (nombre) => `Usado como imagen del grupo «${nombre}».`,
  ARCHIVO_BOLETIN: (nombre) => `Usado como archivo del boletín «${nombre}».`,
  PORTADA_SEDE: (nombre) => `Usado como portada de la sede «${nombre}».`,
  CONTENIDO_PUBLICACION: (nombre) => `Usado dentro del contenido de la publicación «${nombre}».`,
  CONTENIDO_SERVICIO: (nombre) => `Usado dentro del contenido del servicio «${nombre}».`,
  BLOQUE_PAGINA: (nombre) => `Usado en un bloque de la página «${nombre}».`,
};

function errorEnUso(usos) {
  const detalles = usos
    .slice(0, USOS_DETALLADOS)
    .map((uso) => ({ campo: 'id', mensaje: DESCRIPCION_DE_USO[uso.tipo](uso.nombre) }));

  const restantes = usos.length - USOS_DETALLADOS;
  if (restantes > 0) {
    detalles.push({
      campo: 'id',
      mensaje: restantes === 1 ? 'Y 1 uso más.' : `Y ${restantes} usos más.`,
    });
  }
  return ErrorApp.conflicto(MENSAJE_EN_USO, detalles);
}

// Claves de todos los objetos del archivo en el bucket: la principal y sus variantes. Los
// archivos del seed y de URL fija (/media/..., https://...) no están en el bucket: no tienen.
function clavesDelArchivo(fila) {
  if (fila.url.startsWith('/') || /^https?:\/\//i.test(fila.url)) return [];

  const variantes = ANCHOS_VARIANTES.filter(
    (ancho) =>
      fila.url.endsWith('.webp') && Number.isInteger(fila.ancho_px) && ancho < fila.ancho_px,
  ).map((ancho) => claveDeVariante(fila.url, ancho));
  return [fila.url, ...variantes];
}

// Borra la fila y los objetos en una sola transacción: si el bucket falla (503) la fila vuelve.
export async function eliminarArchivo(usuario, id) {
  const fila = await archivoDelUsuario(usuario, id);

  // Fuera del Administrador, cada usuario borra solo lo que subió.
  if (!esAdministrador(usuario) && fila.subido_por_id !== usuario.id) {
    throw ErrorApp.sinPermiso(MENSAJE_SOLO_LO_PROPIO);
  }

  const usos = await modelo.usosDe(id);
  if (usos.length > 0) throw errorEnUso(usos);

  try {
    await transaccion(async (db) => {
      await modelo.eliminar(id, db);
      await eliminarObjetos(clavesDelArchivo(fila));
    });
  } catch (error) {
    // Otro usuario lo usó justo ahora: la clave foránea lo impide (23503).
    if (error.code === '23503') throw errorEnUso(await modelo.usosDe(id));
    throw error;
  }
}
