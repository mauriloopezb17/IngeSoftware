// Gestión de usuarios en el panel CMS (docs/api/admin.md, sección 14). Solo Administrador.
import { ROLES } from '../constantes/catalogos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/usuarios.model.js';
import { patronBusqueda, sinAcentosSql } from '../utils/busqueda.js';
import { hashearContrasena } from '../utils/contrasenas.js';
import { formatearFechaHora } from '../utils/formato.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { registrarCambio } from './bitacora.service.js';

function aUsuarioAdmin(fila, gruposAsignados = []) {
  return {
    id: fila.id,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    rol: ROLES.aEnumeracion(fila.rol_nombre),
    sede: fila.sede_id
      ? { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug }
      : null,
    gruposAsignados,
    activo: fila.activo,
    fechaUltimoAcceso: formatearFechaHora(fila.fecha_ultimo_acceso),
    fechaCreacion: formatearFechaHora(fila.fecha_creacion),
  };
}

function exigirSedeSiCorresponde(rolCodigo, sedeId) {
  if (rolCodigo !== 'ADMINISTRADOR' && (sedeId === null || sedeId === undefined)) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede es obligatoria para este rol.' },
    ]);
  }
}

async function validarGruposAsignados(
  { rolFinal, sedeIdFinal, grupoIds, esCreacion, cambioDeRol },
  db,
) {
  if (rolFinal !== 'COORDINADOR') {
    if (grupoIds !== undefined && grupoIds.length > 0) {
      throw ErrorApp.validacion(undefined, [
        {
          campo: 'grupoIds',
          mensaje: 'Solo los usuarios con rol Coordinador de grupo pueden tener grupos asignados.',
        },
      ]);
    }
    return;
  }

  if ((esCreacion || cambioDeRol) && (!grupoIds || grupoIds.length === 0)) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'grupoIds', mensaje: 'El coordinador debe tener al menos un grupo asignado.' },
    ]);
  }

  if (grupoIds === undefined) return;
  if (grupoIds.length === 0) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'grupoIds', mensaje: 'El coordinador debe tener al menos un grupo asignado.' },
    ]);
  }

  const validos = await modelo.gruposDeSedePorIds(sedeIdFinal, grupoIds, db);
  if (validos.length !== grupoIds.length) {
    throw ErrorApp.validacion(undefined, [
      {
        campo: 'grupoIds',
        mensaje: 'Todos los grupos asignados deben existir y pertenecer a la sede del coordinador.',
      },
    ]);
  }
}

function traducirErrorCorreoUnico(err) {
  if (err?.code === '23505') {
    throw ErrorApp.conflicto('Ya existe un usuario registrado con ese correo electrónico.');
  }
  throw err;
}

export async function listarUsuarios(consulta) {
  const rolNombres = consulta.rol
    ? consulta.rol.map((codigo) => ROLES.nombreDe(codigo))
    : undefined;
  const patron = consulta.buscar ? patronBusqueda(consulta.buscar) : undefined;

  const { filas, total } = await modelo.listarAdmin({
    rolNombres,
    sedeSlug: consulta.sede,
    activo: consulta.activo,
    patron,
    sinAcentos: sinAcentosSql,
    orden: consulta.orden,
    limite: consulta.porPagina,
    desplazamiento: desplazamiento(consulta.pagina, consulta.porPagina),
  });

  const gruposPorUsuario = await modelo.gruposDeUsuarios(filas.map((f) => f.id));

  return {
    datos: filas.map((f) => aUsuarioAdmin(f, gruposPorUsuario.get(f.id) ?? [])),
    paginacion: armarPaginacion({
      pagina: consulta.pagina,
      porPagina: consulta.porPagina,
      total,
    }),
  };
}

export async function obtenerUsuario(id) {
  const fila = await modelo.buscarDetalleAdmin(id);
  if (!fila) throw ErrorApp.noEncontrado('El usuario no existe.');
  const grupos = await modelo.gruposAsignadosDe(id);
  return aUsuarioAdmin(fila, grupos);
}

export async function crearUsuario(datos, contexto) {
  exigirSedeSiCorresponde(datos.rol, datos.sedeId);

  if (datos.sedeId !== null && !(await modelo.existeSede(datos.sedeId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede indicada no existe.' },
    ]);
  }

  if (await modelo.existeOtroCorreo(datos.correo)) {
    throw ErrorApp.conflicto('Ya existe un usuario registrado con ese correo electrónico.');
  }

  const hashContrasena = await hashearContrasena(datos.contrasena);
  const rolNombre = ROLES.nombreDe(datos.rol);

  let idCreado;
  try {
    idCreado = await transaccion(async (db) => {
      await validarGruposAsignados(
        {
          rolFinal: datos.rol,
          sedeIdFinal: datos.sedeId,
          grupoIds: datos.grupoIds,
          esCreacion: true,
          cambioDeRol: false,
        },
        db,
      );
      const fila = await modelo.crearAdmin(
        {
          rolNombre,
          sedeId: datos.sedeId,
          nombreCompleto: datos.nombreCompleto,
          correo: datos.correo,
          hashContrasena,
          activo: datos.activo,
        },
        db,
      );
      if (datos.rol === 'COORDINADOR' && datos.grupoIds?.length) {
        await modelo.reemplazarGruposAsignados(fila.id, datos.grupoIds, db);
      }
      await registrarCambio(db, contexto, {
        entidad: 'usuario',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });
      return fila.id;
    });
  } catch (err) {
    traducirErrorCorreoUnico(err);
  }

  return obtenerUsuario(idCreado);
}

export async function actualizarUsuario(usuarioActual, id, datos, contexto) {
  if (
    datos.sedeId !== undefined &&
    datos.sedeId !== null &&
    !(await modelo.existeSede(datos.sedeId))
  ) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedeId', mensaje: 'La sede indicada no existe.' },
    ]);
  }

  if (datos.correo !== undefined && (await modelo.existeOtroCorreo(datos.correo, id))) {
    throw ErrorApp.conflicto('Ya existe un usuario registrado con ese correo electrónico.');
  }

  try {
    await transaccion(async (db) => {
      const anteriorConRol = await modelo.filaParaModificar(id, db);
      if (!anteriorConRol) throw ErrorApp.noEncontrado('El usuario no existe.');

      const rolActual = ROLES.codigoDe(anteriorConRol.rol_nombre);
      const rolFinal = datos.rol ?? rolActual;
      const activoFinal = datos.activo ?? anteriorConRol.activo;
      const sedeIdFinal = datos.sedeId !== undefined ? datos.sedeId : anteriorConRol.sede_id;

      if (id === usuarioActual.id) {
        if (activoFinal === false) {
          throw ErrorApp.conflicto('No puedes desactivar tu propia cuenta.');
        }
        if (rolFinal !== 'ADMINISTRADOR') {
          throw ErrorApp.conflicto('No puedes quitarte el rol de Administrador a ti mismo.');
        }
      }

      const eraAdminActivo = rolActual === 'ADMINISTRADOR' && anteriorConRol.activo;
      const seguiraAdminActivo = rolFinal === 'ADMINISTRADOR' && activoFinal;
      if (eraAdminActivo && !seguiraAdminActivo) {
        const otrosAdmins = await modelo.contarAdminsActivosExcluyendo(
          ROLES.nombreDe('ADMINISTRADOR'),
          id,
          db,
        );
        if (otrosAdmins === 0) {
          throw ErrorApp.conflicto('Debe quedar al menos un Administrador activo en el sistema.');
        }
      }

      exigirSedeSiCorresponde(rolFinal, sedeIdFinal);
      await validarGruposAsignados(
        {
          rolFinal,
          sedeIdFinal,
          grupoIds: datos.grupoIds,
          esCreacion: false,
          cambioDeRol: rolFinal !== rolActual,
        },
        db,
      );

      let rolId;
      if (datos.rol !== undefined && datos.rol !== rolActual) {
        rolId = await modelo.obtenerRolIdPorNombre(ROLES.nombreDe(datos.rol), db);
      }

      const { rol_nombre: _rolNombre, ...anterior } = anteriorConRol;
      const nuevo = await modelo.actualizar(
        id,
        {
          rolId,
          sedeId: datos.sedeId,
          nombreCompleto: datos.nombreCompleto,
          correo: datos.correo,
          activo: datos.activo,
        },
        db,
      );

      if (rolFinal !== 'COORDINADOR' && rolActual === 'COORDINADOR') {
        await modelo.reemplazarGruposAsignados(id, [], db);
      } else if (rolFinal === 'COORDINADOR' && datos.grupoIds !== undefined) {
        await modelo.reemplazarGruposAsignados(id, datos.grupoIds, db);
      }

      await registrarCambio(db, contexto, {
        entidad: 'usuario',
        entidadId: id,
        accion: 'UPDATE',
        anterior,
        nuevo,
      });
    });
  } catch (err) {
    traducirErrorCorreoUnico(err);
  }

  return obtenerUsuario(id);
}

export async function restablecerContrasena(id, contrasenaNueva, contexto) {
  const hashActual = await modelo.obtenerHashContrasena(id);
  if (!hashActual) throw ErrorApp.noEncontrado('El usuario no existe.');

  const hashNuevo = await hashearContrasena(contrasenaNueva);

  await transaccion(async (db) => {
    await modelo.actualizarContrasena(id, hashNuevo, db);
    await registrarCambio(db, contexto, {
      entidad: 'usuario',
      entidadId: id,
      accion: 'UPDATE',
      anterior: { hash_contrasena: hashActual },
      nuevo: { hash_contrasena: hashNuevo },
    });
  });
}
