// Eventos del calendario en el panel (contrato: docs/api/admin.md, sección 4). Se publican
// directamente, sin revisión. Toda modificación va en una transacción con su bitácora.
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/adminEventos.model.js';
import { actualizarFila, eliminarFila, filaParaModificar } from '../models/comunes.model.js';
import { exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { formatearFechaHora, imagen } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio } from './bitacora.service.js';
import { sedeDelRecursoNuevo, verificarArchivos } from './referencias.service.js';

const ENTIDAD = 'evento';

function aEvento(fila) {
  return {
    id: fila.id,
    sede: { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug },
    estado: ESTADOS_PUBLICACION.aEnumeracion(fila.estado_nombre),
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    lugar: fila.lugar,
    fechaInicio: formatearFechaHora(fila.fecha_inicio),
    fechaFin: formatearFechaHora(fila.fecha_fin),
    todoElDia: fila.todo_el_dia,
    categoria: fila.categoria,
    imagen: imagen({
      id: fila.imagen_id,
      url: fila.imagen_url,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    idExternoM365: fila.id_externo_m365,
    creadoPor: { id: fila.creado_por, nombreCompleto: fila.creado_por_nombre },
    finalizado: fila.finalizado,
  };
}

export async function listarEventos(sedeFiltro, consulta) {
  const { pagina, porPagina, orden } = consulta;
  const { filas, total } = await modelo.listar(
    {
      sedeSlug: sedeFiltro,
      desde: consulta.desde,
      hasta: consulta.hasta,
      categorias: consulta.categoria,
      estados: consulta.estado?.map((codigo) => ESTADOS_PUBLICACION.nombreDe(codigo)),
      finalizados: consulta.finalizados,
    },
    {
      limite: porPagina,
      desplazamiento: desplazamiento(pagina, porPagina),
      ascendente: orden === 'fechaInicio',
    },
  );
  return { datos: filas.map(aEvento), paginacion: armarPaginacion({ total, pagina, porPagina }) };
}

export async function obtenerEvento(usuario, id) {
  const fila = await modelo.buscarPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('El evento no existe.');
  exigirSedeDelRecurso(usuario, fila.sede_id);
  return aEvento(fila);
}

// Referencias del cuerpo que vienen con valor: la categoría y la imagen (de la sede).
async function verificarReferencias(db, sedeId, { categoriaEventoId, imagenId }) {
  const detalles = [];
  if (
    categoriaEventoId !== undefined &&
    !(await modelo.categoriaEventoExiste(categoriaEventoId, db))
  ) {
    detalles.push({ campo: 'categoriaEventoId', mensaje: 'La categoría no existe.' });
  }
  const archivos = await verificarArchivos(
    sedeId,
    [{ campo: 'imagenId', clase: 'IMAGEN', id: imagenId }],
    db,
  );
  detalles.push(...archivos.detalles);
  if (detalles.length > 0) throw ErrorApp.validacion(undefined, detalles);
}

export async function crearEvento(usuario, cuerpo, contexto) {
  const id = await transaccion(async (db) => {
    const sedeId = await sedeDelRecursoNuevo(usuario, cuerpo.sedeId, db);
    await verificarReferencias(db, sedeId, cuerpo);

    const fila = await modelo.insertar(
      {
        sedeId,
        categoriaEventoId: cuerpo.categoriaEventoId,
        estadoNombre: ESTADOS_PUBLICACION.nombreDe(cuerpo.estado),
        creadoPor: usuario.id,
        imagenId: cuerpo.imagenId ?? null,
        titulo: cuerpo.titulo,
        descripcion: cuerpo.descripcion ?? null,
        lugar: cuerpo.lugar ?? null,
        fechaInicio: cuerpo.fechaInicio,
        fechaFin: cuerpo.fechaFin ?? null,
        todoElDia: cuerpo.todoElDia,
      },
      db,
    );
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: fila.id,
      accion: 'INSERT',
      nuevo: fila,
    });
    return fila.id;
  });
  return obtenerEvento(usuario, id);
}

const COLUMNAS = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  lugar: 'lugar',
  fechaInicio: 'fecha_inicio',
  fechaFin: 'fecha_fin',
  todoElDia: 'todo_el_dia',
  categoriaEventoId: 'categoria_evento_id',
  imagenId: 'imagen_id',
};

export async function editarEvento(usuario, id, cambios, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('El evento no existe.');
    exigirSedeDelRecurso(usuario, fila.sede_id);

    await verificarReferencias(db, fila.sede_id, cambios);

    // Con las fechas que quedarían guardadas, el fin no puede ser anterior al inicio.
    const inicio = cambios.fechaInicio ?? fila.fecha_inicio;
    const fin = cambios.fechaFin !== undefined ? cambios.fechaFin : fila.fecha_fin;
    if (fin && new Date(fin) < new Date(inicio)) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'fechaFin', mensaje: 'Debe ser igual o posterior a la fecha de inicio.' },
      ]);
    }

    const columnas = {};
    for (const [campo, columna] of Object.entries(COLUMNAS)) {
      if (cambios[campo] !== undefined) columnas[columna] = cambios[campo];
    }
    if (cambios.estado !== undefined) {
      columnas.estado_publicacion_id = await modelo.idDeEstado(
        ESTADOS_PUBLICACION.nombreDe(cambios.estado),
        db,
      );
    }

    const nuevo = await actualizarFila(db, ENTIDAD, id, columnas);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior: fila,
      nuevo,
    });
  });
  return obtenerEvento(usuario, id);
}

export async function eliminarEvento(usuario, id, contexto) {
  await transaccion(async (db) => {
    const fila = await filaParaModificar(db, ENTIDAD, id);
    if (!fila) throw ErrorApp.noEncontrado('El evento no existe.');
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
