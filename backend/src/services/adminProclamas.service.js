// Proclamas matrimoniales en el panel (contrato: docs/api/admin.md, sección 10; RF-02).
// Las publicaciones (1.ª, 2.ª y 3.ª proclama) se registran en la bitácora como cambios de la
// proclama: la entidad es "proclama" y los datos incluyen la lista de publicaciones.
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/adminProclamas.model.js';
import { exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { patronBusqueda } from '../utils/busqueda.js';
import { formatearFecha, formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio } from './bitacora.service.js';
import { sedeDelRecursoNuevo } from './referencias.service.js';

const ENTIDAD = 'proclama';
const MAXIMO_PUBLICACIONES = 3;

function aProclama(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    contrayente1: fila.nombre_contrayente_1,
    contrayente2: fila.nombre_contrayente_2,
    fechaMatrimonio: formatearFechaHora(fila.fecha_matrimonio),
    tramiteOrigenId: fila.tramite_origen_id,
    fechaRegistro: formatearFechaHora(fila.fecha_registro),
    numeroProclama: fila.numero_proclama,
    publicaciones: fila.publicaciones.map(({ numero, fecha }) => ({
      numero,
      fecha: formatearFecha(fecha),
    })),
    vigente: fila.vigente,
  };
}

export async function listarProclamas(sedeFiltro, consulta) {
  const { pagina, porPagina, orden } = consulta;
  const { filas, total } = await modelo.listar(
    {
      sedeSlug: sedeFiltro,
      vigentes: consulta.vigentes,
      anio: consulta.anio,
      patron: consulta.buscar ? patronBusqueda(consulta.buscar) : undefined,
    },
    {
      limite: porPagina,
      desplazamiento: desplazamiento(pagina, porPagina),
      ascendente: orden === 'fechaMatrimonio',
    },
  );
  return { datos: filas.map(aProclama), paginacion: armarPaginacion({ total, pagina, porPagina }) };
}

export async function obtenerProclama(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('La proclama no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return aProclama(fila);
}

// ---- Reglas de las fechas de publicación ----

// Día (YYYY-MM-DD) en Bolivia de un instante.
const diaBolivia = (instante) => formatearFechaHora(new Date(instante)).slice(0, 10);

// Las fechas (YYYY-MM-DD, en orden de número) deben ser crecientes y anteriores al día del
// matrimonio. Devuelve [{ indice, mensaje }] con lo que no cumple.
function problemasDeFechas(fechas, fechaMatrimonio) {
  const dia = diaBolivia(fechaMatrimonio);
  const problemas = [];
  fechas.forEach((fecha, indice) => {
    if (indice > 0 && fecha <= fechas[indice - 1]) {
      problemas.push({ indice, mensaje: 'Debe ser posterior a la proclama anterior.' });
    } else if (fecha >= dia) {
      problemas.push({ indice, mensaje: 'Debe ser anterior a la fecha del matrimonio.' });
    }
  });
  return problemas;
}

// Lanza 400 si hay problemas. campoDe(indice) da el campo del detalle.
function exigirFechas(fechas, fechaMatrimonio, campoDe) {
  const problemas = problemasDeFechas(fechas, fechaMatrimonio);
  if (problemas.length > 0) {
    throw ErrorApp.validacion(
      undefined,
      problemas.map(({ indice, mensaje }) => ({ campo: campoDe(indice), mensaje })),
    );
  }
}

// Estado de la proclama para la bitácora: la fila y su lista de publicaciones.
async function instantanea(fila, db) {
  const publicaciones = await modelo.publicacionesDe(fila.id, db);
  return {
    ...fila,
    publicaciones: publicaciones.map((p) => ({
      numero: p.numero_proclama,
      fecha: p.fecha_publicacion,
    })),
  };
}

const errorTramiteRepetido = () =>
  ErrorApp.conflicto('Ya existe una proclama para ese trámite.', [
    { campo: 'tramiteOrigenId', mensaje: 'Ya está en uso.' },
  ]);

// ---- Proclama ----

export async function crearProclama(usuario, cuerpo, contexto) {
  const id = await transaccion(async (db) => {
    const sedeId = await sedeDelRecursoNuevo(usuario, cuerpo.sedeId, db);
    const publicaciones = cuerpo.publicaciones ?? [];
    exigirFechas(
      publicaciones.map((p) => p.fecha),
      cuerpo.fechaMatrimonio,
      (indice) => `publicaciones.${indice}.fecha`,
    );

    let fila;
    try {
      fila = await modelo.insertar(
        {
          sedeId,
          tramiteOrigenId: cuerpo.tramiteOrigenId ?? null,
          contrayente1: cuerpo.contrayente1,
          contrayente2: cuerpo.contrayente2,
          fechaMatrimonio: cuerpo.fechaMatrimonio,
        },
        db,
      );
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'proclama_ak_1') {
        throw errorTramiteRepetido();
      }
      throw error;
    }
    for (const [indice, { fecha }] of publicaciones.entries()) {
      await modelo.insertarPublicacion(fila.id, indice + 1, fecha, db);
    }

    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: await instantanea(fila, db),
    });
    return fila.id;
  });
  return obtenerProclama(usuario, id);
}

// Proclama bloqueada: 404 si no existe, 403 si es de otra sede.
async function proclamaParaModificar(usuario, id, db) {
  const fila = await modelo.bloquear(id, db);
  if (!fila) throw ErrorApp.noEncontrado('La proclama no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

export async function editarProclama(usuario, id, cambios, contexto) {
  await transaccion(async (db) => {
    const fila = await proclamaParaModificar(usuario, id, db);
    const anterior = await instantanea(fila, db);

    const fechaMatrimonio = cambios.fechaMatrimonio ?? fila.fecha_matrimonio;
    // Las publicaciones que ya existen deben seguir siendo anteriores al matrimonio.
    const dia = diaBolivia(fechaMatrimonio);
    if (
      cambios.fechaMatrimonio !== undefined &&
      anterior.publicaciones.some((p) => formatearFecha(p.fecha) >= dia)
    ) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'fechaMatrimonio',
          mensaje: 'Debe ser posterior a la última publicación de la proclama.',
        },
      ]);
    }

    const nuevaFila = await modelo.actualizar(
      id,
      {
        contrayente1: cambios.contrayente1 ?? fila.nombre_contrayente_1,
        contrayente2: cambios.contrayente2 ?? fila.nombre_contrayente_2,
        fechaMatrimonio,
      },
      db,
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior,
      nuevo: await instantanea(nuevaFila, db),
    });
  });
  return obtenerProclama(usuario, id);
}

// Solo se elimina si ninguna publicación llegó a su fecha: el historial es público.
export async function eliminarProclama(usuario, id, contexto) {
  await transaccion(async (db) => {
    const fila = await proclamaParaModificar(usuario, id, db);
    if ((await modelo.contarAlcanzadas(id, db)) > 0) {
      throw ErrorApp.conflicto(
        'La proclama ya tiene publicaciones que llegaron a su fecha y forma parte del historial público: no se puede eliminar.',
      );
    }

    const anterior = await instantanea(fila, db);
    await modelo.eliminar(id, db);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'DELETE',
      anterior,
    });
  });
}

// ---- Publicaciones de la proclama ----

// Aplica "operar" sobre la lista de publicaciones y registra el cambio de la proclama.
async function modificarPublicaciones(usuario, id, contexto, operar) {
  await transaccion(async (db) => {
    const fila = await proclamaParaModificar(usuario, id, db);
    const anterior = await instantanea(fila, db);
    await operar({ db, fila, publicaciones: anterior.publicaciones });
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior,
      nuevo: await instantanea(fila, db),
    });
  });
  return obtenerProclama(usuario, id);
}

// POST /:id/publicaciones: agrega la siguiente (el número se asigna solo).
export function agregarPublicacion(usuario, id, { fecha }, contexto) {
  return modificarPublicaciones(usuario, id, contexto, async ({ db, fila, publicaciones }) => {
    if (publicaciones.length >= MAXIMO_PUBLICACIONES) {
      throw ErrorApp.conflicto(`La proclama ya tiene sus ${MAXIMO_PUBLICACIONES} publicaciones.`);
    }
    const fechas = [...publicaciones.map((p) => formatearFecha(p.fecha)), fecha];
    exigirFechas(fechas, fila.fecha_matrimonio, () => 'fecha');
    await modelo.insertarPublicacion(id, fechas.length, fecha, db);
  });
}

// PATCH /:id/publicaciones/:numero: cambia la fecha, sin salirse del orden ni pasar del matrimonio.
export function cambiarPublicacion(usuario, id, numero, { fecha }, contexto) {
  return modificarPublicaciones(usuario, id, contexto, async ({ db, fila, publicaciones }) => {
    if (!publicaciones.some((p) => p.numero === numero)) {
      throw ErrorApp.noEncontrado(`La proclama no tiene la publicación ${numero}.`);
    }
    const fechas = publicaciones.map((p) =>
      p.numero === numero ? fecha : formatearFecha(p.fecha),
    );
    exigirFechas(fechas, fila.fecha_matrimonio, () => 'fecha');
    await modelo.cambiarFechaPublicacion(id, numero, fecha, db);
  });
}

// DELETE /:id/publicaciones/:numero: solo se quita la última.
export function quitarPublicacion(usuario, id, numero, contexto) {
  return modificarPublicaciones(usuario, id, contexto, async ({ db, publicaciones }) => {
    const ultima = publicaciones.at(-1)?.numero;
    if (!publicaciones.some((p) => p.numero === numero)) {
      throw ErrorApp.noEncontrado(`La proclama no tiene la publicación ${numero}.`);
    }
    if (numero !== ultima) {
      throw ErrorApp.conflicto(`Solo se puede quitar la última publicación (la ${ultima}).`);
    }
    await modelo.eliminarPublicacion(id, numero, db);
  });
}
