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

function aUsuarioAdmin(fila) {
  return {
    id: fila.id,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    rol: ROLES.aEnumeracion(fila.rol_nombre),
    sede: fila.sede_id
      ? { id: fila.sede_id, nombre: fila.sede_nombre, slug: fila.sede_slug }
      : null,
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

  return {
    datos: filas.map(aUsuarioAdmin),
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
  return aUsuarioAdmin(fila);
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

  return aUsuarioAdmin(await modelo.buscarDetalleAdmin(idCreado));
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

  return aUsuarioAdmin(await modelo.buscarDetalleAdmin(id));
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
