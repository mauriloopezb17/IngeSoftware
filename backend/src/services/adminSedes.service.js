// Gestión de sedes y redes sociales en el panel CMS (docs/api/admin.md, sección 9).
import { TIPOS_SEDE } from '../constantes/catalogos.js';
import { PERMISOS, tienePermiso } from '../constantes/permisos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/sedes.model.js';
import { generarSlug, validarImagenDeSede } from '../utils/adminContenido.js';
import { esAdministrador, exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { aCamelCase, imagen } from '../utils/formato.js';
import { registrarCambio } from './bitacora.service.js';

const CAMPOS_SOLO_ADMIN = ['slug', 'tipo', 'sedePadreId', 'activo'];

function esObjetoPlano(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

const camelASnake = (clave) => clave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);

// Convierte configuracion de camelCase a snake_case y la fusiona con la existente; null borra claves.
function fusionarConfiguracion(base, cambios) {
  const resultado = esObjetoPlano(base) ? { ...base } : {};

  for (const [claveCamel, valor] of Object.entries(cambios)) {
    const clave = camelASnake(claveCamel);
    if (valor === null) {
      delete resultado[clave];
    } else if (esObjetoPlano(valor)) {
      resultado[clave] = fusionarConfiguracion(resultado[clave], valor);
    } else if (Array.isArray(valor)) {
      resultado[clave] = valor.map((item) =>
        esObjetoPlano(item) ? fusionarConfiguracion({}, item) : item,
      );
    } else {
      resultado[clave] = valor;
    }
  }

  return resultado;
}

function aSedeAdmin(fila) {
  const tieneUbicacion = fila.latitud !== null && fila.longitud !== null;

  return {
    id: fila.id,
    nombre: fila.nombre,
    slug: fila.slug,
    tipo: TIPOS_SEDE.aEnumeracion(fila.tipo_nombre),
    sedePadre: fila.sede_padre,
    direccion: fila.direccion,
    telefono: fila.telefono,
    whatsapp: fila.whatsapp,
    correo: fila.correo,
    ubicacion: tieneUbicacion ? { latitud: fila.latitud, longitud: fila.longitud } : null,
    imagenPortada: imagen({
      id: fila.imagen_id,
      url: fila.url_imagen_portada,
      textoAlternativo: fila.imagen_texto_alternativo,
      ancho: fila.imagen_ancho,
      alto: fila.imagen_alto,
    }),
    redesSociales: fila.redes_sociales,
    configuracion: aCamelCase(fila.configuracion ?? {}),
    activo: fila.activo,
  };
}

async function sedeDelUsuario(usuario, id) {
  const fila = await modelo.buscarDetalleAdminPorId(id);
  if (!fila) throw ErrorApp.noEncontrado('La sede no existe.');
  exigirSedeDelRecurso(usuario, fila.id);
  return fila;
}

async function validarRedes(redes) {
  if (!redes || redes.length === 0) return;
  const ids = redes.map((r) => r.redSocialId);
  const existentes = new Set(await modelo.redesExistentes(ids));
  const faltantes = ids.filter((id) => !existentes.has(id));
  if (faltantes.length > 0) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'redesSociales', mensaje: 'Una o más redes sociales indicadas no existen.' },
    ]);
  }
}

function traducirErrorSlugUnico(err, slugValor) {
  if (err?.code === '23505') {
    throw ErrorApp.conflicto(`Ya existe una sede con el slug "${slugValor}".`);
  }
  throw err;
}

export async function listarSedes(usuario) {
  const tipoPrimero = TIPOS_SEDE.nombreDe('PARROQUIA');
  if (esAdministrador(usuario)) {
    const filas = await modelo.listarAdmin({ tipoPrimero });
    return filas.map(aSedeAdmin);
  }
  if (usuario.sedeId === null || usuario.sedeId === undefined) {
    throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
  }
  const filas = await modelo.listarAdmin({ tipoPrimero, sedeId: usuario.sedeId });
  return filas.map(aSedeAdmin);
}

export async function obtenerSede(usuario, id) {
  return aSedeAdmin(await sedeDelUsuario(usuario, id));
}

export async function crearSede(datos, contexto) {
  const slugFinal = datos.slug ?? generarSlug(datos.nombre, 80);
  if (!slugFinal) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'nombre', mensaje: 'No se pudo generar un slug válido a partir del nombre.' },
    ]);
  }

  const tipoSedeId = await modelo.obtenerTipoSedeIdPorNombre(TIPOS_SEDE.nombreDe(datos.tipo));
  if (!tipoSedeId) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'tipo', mensaje: 'El tipo de sede indicado no existe.' },
    ]);
  }

  if (datos.sedePadreId !== null && !(await modelo.existeSede(datos.sedePadreId))) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedePadreId', mensaje: 'La sede padre indicada no existe.' },
    ]);
  }

  await validarRedes(datos.redesSociales);
  const configuracionFinal = fusionarConfiguracion({}, datos.configuracion);

  let idCreado;
  try {
    idCreado = await transaccion(async (db) => {
      const fila = await modelo.crear(
        {
          tipoSedeId,
          sedePadreId: datos.sedePadreId,
          nombre: datos.nombre,
          slug: slugFinal,
          direccion: datos.direccion,
          telefono: datos.telefono,
          whatsapp: datos.whatsapp,
          correo: datos.correo,
          latitud: datos.latitud,
          longitud: datos.longitud,
          urlImagenPortada: null,
          configuracion: configuracionFinal,
          activo: datos.activo,
        },
        db,
      );

      await registrarCambio(db, contexto, {
        entidad: 'sede',
        entidadId: fila.id,
        accion: 'INSERT',
        nuevo: fila,
      });

      if (datos.redesSociales.length > 0) {
        const nuevasRedes = await modelo.reemplazarRedesDeSede(fila.id, datos.redesSociales, db);
        await registrarCambio(db, contexto, {
          entidad: 'sede_red_social',
          entidadId: fila.id,
          accion: 'INSERT',
          nuevo: { sede_id: fila.id, redes: nuevasRedes },
        });
      }

      return fila.id;
    });
  } catch (err) {
    traducirErrorSlugUnico(err, slugFinal);
  }

  return aSedeAdmin(await modelo.buscarDetalleAdminPorId(idCreado));
}

export async function actualizarSede(usuario, id, datos, contexto) {
  const puedeGestionarSedes = tienePermiso(usuario.rol, PERMISOS.SEDES_GESTIONAR);
  const puedeEditarPropia = tienePermiso(usuario.rol, PERMISOS.SEDE_EDITAR);

  if (!puedeGestionarSedes && !puedeEditarPropia) {
    throw ErrorApp.sinPermiso('Tu rol no tiene permiso para editar sedes.');
  }

  const tocaCampoSoloAdmin = CAMPOS_SOLO_ADMIN.some((campo) => datos[campo] !== undefined);
  if (!puedeGestionarSedes && tocaCampoSoloAdmin) {
    throw ErrorApp.sinPermiso(
      'Solo un administrador puede cambiar slug, tipo, sede padre o estado activo de una sede.',
    );
  }

  await sedeDelUsuario(usuario, id);

  let urlImagenPortada;
  if (datos.imagenPortadaId !== undefined) {
    if (datos.imagenPortadaId === null) {
      urlImagenPortada = null;
    } else {
      const archivo = await validarImagenDeSede(datos.imagenPortadaId, id, 'imagenPortadaId');
      urlImagenPortada = archivo.url;
    }
  }

  let tipoSedeId;
  if (datos.tipo !== undefined) {
    tipoSedeId = await modelo.obtenerTipoSedeIdPorNombre(TIPOS_SEDE.nombreDe(datos.tipo));
    if (!tipoSedeId) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'tipo', mensaje: 'El tipo de sede indicado no existe.' },
      ]);
    }
  }

  if (datos.sedePadreId !== undefined && datos.sedePadreId !== null) {
    if (datos.sedePadreId === id) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'sedePadreId', mensaje: 'Una sede no puede ser su propia sede padre.' },
      ]);
    }
    if (!(await modelo.existeSede(datos.sedePadreId))) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'sedePadreId', mensaje: 'La sede padre indicada no existe.' },
      ]);
    }
  }

  if (datos.redesSociales !== undefined) {
    await validarRedes(datos.redesSociales);
  }

  let slugObjetivo;
  try {
    await transaccion(async (db) => {
      const anterior = await modelo.filaParaModificar(id, db);
      if (!anterior) throw ErrorApp.noEncontrado('La sede no existe.');

      const latFinal = datos.latitud !== undefined ? datos.latitud : anterior.latitud;
      const lonFinal = datos.longitud !== undefined ? datos.longitud : anterior.longitud;
      if ((latFinal === null) !== (lonFinal === null)) {
        throw ErrorApp.validacion(undefined, [
          {
            campo: 'latitud',
            mensaje: 'Debes indicar latitud y longitud juntas, o dejar ambas en null.',
          },
        ]);
      }

      const nombreFinal = datos.nombre ?? anterior.nombre;
      slugObjetivo =
        datos.slug !== undefined ? (datos.slug ?? generarSlug(nombreFinal, 80)) : undefined;
      if (slugObjetivo === '') {
        throw ErrorApp.validacion(undefined, [
          { campo: 'slug', mensaje: 'No se pudo generar un slug válido.' },
        ]);
      }

      const configuracionFinal =
        datos.configuracion !== undefined
          ? fusionarConfiguracion(anterior.configuracion, datos.configuracion)
          : undefined;

      const cambiosSede = {
        tipoSedeId,
        sedePadreId: datos.sedePadreId,
        nombre: datos.nombre,
        slug: slugObjetivo,
        direccion: datos.direccion,
        telefono: datos.telefono,
        whatsapp: datos.whatsapp,
        correo: datos.correo,
        latitud: datos.latitud,
        longitud: datos.longitud,
        urlImagenPortada,
        configuracion: configuracionFinal,
        activo: datos.activo,
      };

      const hayCambiosSede = Object.values(cambiosSede).some((v) => v !== undefined);
      if (hayCambiosSede) {
        const nuevo = await modelo.actualizar(id, cambiosSede, db);
        await registrarCambio(db, contexto, {
          entidad: 'sede',
          entidadId: id,
          accion: 'UPDATE',
          anterior,
          nuevo,
        });
      }

      if (datos.redesSociales !== undefined) {
        const redesAnteriores = await modelo.obtenerRedesDeSede(id, db);
        const redesNuevas = await modelo.reemplazarRedesDeSede(id, datos.redesSociales, db);
        await registrarCambio(db, contexto, {
          entidad: 'sede_red_social',
          entidadId: id,
          accion: 'UPDATE',
          anterior: { sede_id: id, redes: redesAnteriores },
          nuevo: { sede_id: id, redes: redesNuevas },
        });
      }
    });
  } catch (err) {
    traducirErrorSlugUnico(err, slugObjetivo ?? '');
  }

  return aSedeAdmin(await modelo.buscarDetalleAdminPorId(id));
}
