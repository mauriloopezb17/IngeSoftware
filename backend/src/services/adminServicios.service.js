// Gestión de servicios y preguntas frecuentes en el panel CMS (docs/api/admin.md, sección 6).
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/servicios.model.js';
import { generarSlug, reordenarPorSede } from '../utils/adminContenido.js';
import { exigirSedeDelRecurso, sedeParaCrear } from '../utils/alcanceSede.js';
import { registrarCambio } from './bitacora.service.js';

function aServicioAdmin(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    slug: fila.slug,
    nombre: fila.nombre,
    descripcionCorta: fila.descripcion_corta,
    icono: fila.icono,
    contenido: fila.contenido,
    orden: fila.orden,
    visible: fila.visible,
    preguntasFrecuentes: fila.preguntas_frecuentes,
  };
}

function aPreguntaAdmin(fila) {
  return {
    id: fila.id,
    pregunta: fila.pregunta,
    respuesta: fila.respuesta,
    orden: fila.orden,
    activa: fila.activa,
  };
}

async function servicioDelUsuario(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El servicio no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return fila;
}

function resolverSlugServicio(slugEnviado, nombre) {
  if (slugEnviado !== null) return slugEnviado;
  const generado = generarSlug(nombre, 80);
  if (!generado) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'nombre', mensaje: 'No se pudo generar un slug válido a partir del nombre.' },
    ]);
  }
  return generado;
}

function traducirErrorUnicoSlug(err, slugValor) {
  if (err?.code === '23505') {
    throw ErrorApp.conflicto(`Ya existe un servicio con el slug "${slugValor}" en esta sede.`);
  }
  throw err;
}

export async function listarServicios(sedeFiltro, consulta) {
  const filas = await modelo.listarAdmin({
    sedeSlug: sedeFiltro,
    visible: consulta.visible,
  });
  return filas.map(aServicioAdmin);
}

export async function obtenerServicio(usuario, id) {
  return aServicioAdmin(await servicioDelUsuario(usuario, id));
}

export async function crearServicio(usuario, datos, contexto) {
  const sedeId = sedeParaCrear(usuario, datos.sedeId ?? usuario.sedeId ?? undefined);
  if (sedeId === undefined || sedeId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'Indica la sede del servicio.' },
    ]);
  }
  if (!(await modelo.existeSede(sedeId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede indicada no existe.' },
    ]);
  }

  const slugFinal = resolverSlugServicio(datos.slug, datos.nombre);

  let idCreado;
  try {
    idCreado = await transaccion(async (db) => {
      const fila = await modelo.crear(
        {
          sedeId,
          slug: slugFinal,
          nombre: datos.nombre,
          descripcionCorta: datos.descripcionCorta,
          icono: datos.icono,
          contenido: datos.contenido,
          visible: datos.visible,
        },
        db,
      );
      await registrarCambio(db, contexto, {
        entidad: 'servicio',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });
      return fila.id;
    });
  } catch (err) {
    traducirErrorUnicoSlug(err, slugFinal);
  }

  return aServicioAdmin(await modelo.buscarPorId(idCreado));
}

export async function actualizarServicio(usuario, id, datos, contexto) {
  await servicioDelUsuario(usuario, id);

  let slugObjetivo;
  try {
    await transaccion(async (db) => {
      const anterior = await modelo.filaParaModificar(id, db);
      if (!anterior) throw ErrorApp.noEncontrado('El servicio no existe.');

      const nombreFinal = datos.nombre ?? anterior.nombre;
      slugObjetivo =
        datos.slug !== undefined ? resolverSlugServicio(datos.slug, nombreFinal) : undefined;

      const nuevo = await modelo.actualizar(
        id,
        {
          nombre: datos.nombre,
          slug: slugObjetivo,
          descripcionCorta: datos.descripcionCorta,
          icono: datos.icono,
          contenido: datos.contenido,
          visible: datos.visible,
        },
        db,
      );

      await registrarCambio(db, contexto, {
        entidad: 'servicio',
        entidadId: id,
        accion: 'UPDATE',
        anterior,
        nuevo,
      });
    });
  } catch (err) {
    traducirErrorUnicoSlug(err, slugObjetivo ?? '');
  }

  return aServicioAdmin(await modelo.buscarPorId(id));
}

export async function eliminarServicio(usuario, id, contexto) {
  await servicioDelUsuario(usuario, id);

  await transaccion(async (db) => {
    const anterior = await modelo.filaParaModificar(id, db);
    if (!anterior) throw ErrorApp.noEncontrado('El servicio no existe.');

    const desvinculadas = await modelo.desvincularPreguntasDeServicio(id, db);
    for (const par of desvinculadas) {
      await registrarCambio(db, contexto, {
        entidad: 'pregunta_frecuente',
        entidadId: par.anterior.id,
        accion: 'UPDATE',
        anterior: par.anterior,
        nuevo: par.nuevo,
      });
    }

    const borrado = await modelo.eliminar(id, db);
    await registrarCambio(db, contexto, {
      entidad: 'servicio',
      entidadId: id,
      accion: 'DELETE',
      anterior: borrado,
    });
  });
}

export async function reordenarServicios(usuario, ids, contexto) {
  const sedeId = await reordenarPorSede({
    tabla: 'servicio',
    entidad: 'servicio',
    usuario,
    ids,
    contexto,
    baseOrden: 1,
  });
  const filas = await modelo.listarAdmin({ sedeId });
  return filas.map(aServicioAdmin);
}

export async function crearPreguntaFrecuente(usuario, servicioId, datos, contexto) {
  const servicio = await servicioDelUsuario(usuario, servicioId);

  const creada = await transaccion(async (db) => {
    const fila = await modelo.crearPregunta(
      {
        sedeId: servicio.sede_id,
        servicioId,
        pregunta: datos.pregunta,
        respuesta: datos.respuesta,
        activa: datos.activa,
      },
      db,
    );
    await registrarCambio(db, contexto, {
      entidad: 'pregunta_frecuente',
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: fila,
    });
    return fila;
  });

  return aPreguntaAdmin(creada);
}

export async function actualizarPreguntaFrecuente(
  usuario,
  servicioId,
  preguntaId,
  datos,
  contexto,
) {
  await servicioDelUsuario(usuario, servicioId);

  const actualizada = await transaccion(async (db) => {
    const anterior = await modelo.filaPreguntaParaModificar(servicioId, preguntaId, db);
    if (!anterior) throw ErrorApp.noEncontrado('La pregunta frecuente no existe.');

    const nuevo = await modelo.actualizarPregunta(preguntaId, datos, db);
    await registrarCambio(db, contexto, {
      entidad: 'pregunta_frecuente',
      entidadId: preguntaId,
      accion: 'UPDATE',
      anterior,
      nuevo,
    });
    return nuevo;
  });

  return aPreguntaAdmin(actualizada);
}

export async function eliminarPreguntaFrecuente(usuario, servicioId, preguntaId, contexto) {
  await servicioDelUsuario(usuario, servicioId);

  try {
    await transaccion(async (db) => {
      const borrada = await modelo.eliminarPregunta(servicioId, preguntaId, db);
      if (!borrada) throw ErrorApp.noEncontrado('La pregunta frecuente no existe.');

      await registrarCambio(db, contexto, {
        entidad: 'pregunta_frecuente',
        entidadId: preguntaId,
        accion: 'DELETE',
        anterior: borrada,
      });
    });
  } catch (err) {
    if (err?.code === '23503') {
      throw ErrorApp.conflicto(
        'No se puede eliminar la pregunta frecuente porque está referenciada por mensajes del asistente virtual.',
      );
    }
    throw err;
  }
}

export async function reordenarPreguntasFrecuentes(usuario, servicioId, ids, contexto) {
  await servicioDelUsuario(usuario, servicioId);

  await transaccion(async (db) => {
    const actuales = await modelo.filasPreguntasParaReordenar(servicioId, db);
    const recibidos = new Set(ids);
    const coincide =
      recibidos.size === actuales.length && actuales.every((fila) => recibidos.has(fila.id));

    if (!coincide) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'ids',
          mensaje: 'La lista debe incluir exactamente todas las preguntas del servicio.',
        },
      ]);
    }

    const porId = new Map(actuales.map((fila) => [fila.id, fila]));
    for (let indice = 0; indice < ids.length; indice += 1) {
      const preguntaId = ids[indice];
      const anterior = porId.get(preguntaId);
      if (anterior.orden === indice) continue;

      const nuevo = await modelo.actualizarPregunta(preguntaId, { orden: indice }, db);
      await registrarCambio(db, contexto, {
        entidad: 'pregunta_frecuente',
        entidadId: preguntaId,
        accion: 'UPDATE',
        anterior,
        nuevo,
      });
    }
  });

  const filas = await modelo.listarPreguntasDeServicio(servicioId);
  return filas.map(aPreguntaAdmin);
}
