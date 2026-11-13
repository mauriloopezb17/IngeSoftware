// Boletines parroquiales en PDF en el panel (contrato: docs/api/admin.md, sección 11; RF-06).
// Se publican directamente. El PDF es un archivo de la biblioteca multimedia de la misma sede.
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/adminBoletines.model.js';
import { actualizarFila, eliminarFila, filaParaModificar } from '../models/comunes.model.js';
import { exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { archivo, formatearFecha, formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio } from './bitacora.service.js';
import { sedeDelRecursoNuevo, verificarArchivos } from './referencias.service.js';

const ENTIDAD = 'boletin';

function aBoletin(fila) {
  return {
    id: fila.id,
    titulo: fila.titulo,
    periodo: formatearFecha(fila.periodo),
    fechaPublicacion: formatearFechaHora(fila.fecha_publicacion),
    archivo: archivo({
      id: fila.archivo_id,
      url: fila.archivo_url,
      nombreOriginal: fila.archivo_nombre_original,
      tipoMime: fila.archivo_tipo_mime,
      tamanoBytes: fila.archivo_tamano_bytes,
    }),
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    publicadoPor: { id: fila.publicado_por, nombreCompleto: fila.publicado_por_nombre },
  };
}

// "2026-11" -> "2026-11-01".
const primerDia = (periodo) => `${periodo}-01`;

export async function listarBoletines(sedeFiltro, { anio, pagina, porPagina }) {
  const { filas, total } = await modelo.listar(
    { sedeSlug: sedeFiltro, anio },
    { limite: porPagina, desplazamiento: desplazamiento(pagina, porPagina) },
  );
  return { datos: filas.map(aBoletin), paginacion: armarPaginacion({ total, pagina, porPagina }) };
}

export async function obtenerBoletin(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El boletín no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return aBoletin(fila);
}

// El archivo debe ser un PDF de la biblioteca de la sede.
async function verificarPdf(db, sedeId, archivoId) {
  const { detalles } = await verificarArchivos(
    sedeId,
    [{ campo: 'archivoId', clase: 'DOCUMENTO', id: archivoId }],
    db,
  );
  if (detalles.length > 0) throw ErrorApp.validacion(undefined, detalles);
}

// Un segundo boletín del mismo mes en la sede (boletin_ak_1) es 409.
async function conPeriodoUnico(operacion) {
  try {
    return await operacion();
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'boletin_ak_1') {
      throw ErrorApp.conflicto('Ya existe un boletín de ese periodo en esta sede.', [
        { campo: 'periodo', mensaje: 'Ya hay un boletín de ese mes.' },
      ]);
    }
    throw error;
  }
}

export async function crearBoletin(usuario, cuerpo, contexto) {
  const id = await transaccion(async (db) => {
    const sedeId = await sedeDelRecursoNuevo(usuario, cuerpo.sedeId, db);
    await verificarPdf(db, sedeId, cuerpo.archivoId);

    const fila = await conPeriodoUnico(() =>
      modelo.insertar(
        {
          sedeId,
          archivoId: cuerpo.archivoId,
          publicadoPor: usuario.id,
          titulo: cuerpo.titulo,
          periodo: primerDia(cuerpo.periodo),
        },
        db,
      ),
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: fila,
    });
    return fila.id;
  });
  return obtenerBoletin(usuario, id);
}

export async function editarBoletin(usuario, id, cambios, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('El boletín no existe.');
    exigirSedeDelRecurso(usuario, fila.sede_id);

    if (cambios.archivoId !== undefined) await verificarPdf(db, fila.sede_id, cambios.archivoId);

    const columnas = {};
    if (cambios.titulo !== undefined) columnas.titulo = cambios.titulo;
    if (cambios.periodo !== undefined) columnas.periodo = primerDia(cambios.periodo);
    if (cambios.archivoId !== undefined) columnas.archivo_id = cambios.archivoId;

    const nuevo = await conPeriodoUnico(() => actualizarFila(db, ENTIDAD, id, columnas));
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior: fila,
      nuevo,
    });
  });
  return obtenerBoletin(usuario, id);
}

// El PDF queda en la biblioteca multimedia, sin uso.
export async function eliminarBoletin(usuario, id, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('El boletín no existe.');
    exigirSedeDelRecurso(usuario, fila.sede_id);

    const borrada = await eliminarFila(db, ENTIDAD, id);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'DELETE',
      anterior: borrada,
    });
  });
}
