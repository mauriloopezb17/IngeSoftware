// Gestión de sedes y redes sociales en el panel CMS (docs/api/admin.md, sección 9).
import { TIPOS_SEDE } from '../constantes/catalogos.js';
import { armarPaginacion, desplazamiento } from '../utils/paginacion.js';
import { PERMISOS, tienePermiso } from '../constantes/permisos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/sedes.model.js';
import { generarSlug, validarImagenDeSede } from '../utils/adminContenido.js';
import { esAdministrador, exigirSedeDelRecurso } from '../utils/alcanceSede.js';
import { aCamelCase, imagen } from '../utils/formato.js';
import { registrarCambio } from './bitacora.service.js';
import { armarArbolSedes } from './sedes.service.js';

const CAMPOS_SOLO_ADMIN = ['slug', 'tipo', 'sedePadreId', 'orden', 'activo'];

// Tipos de sede superior permitidos para cada tipo de sede (null = raíz sin padre).
const PADRES_PERMITIDOS = Object.freeze({
  PARROQUIA: null,
  COMUNIDAD_PASIONISTA: null,
  CAPILLA: ['PARROQUIA'],
  COMUNIDAD: ['PARROQUIA', 'CAPILLA'],
});

function mensajePadreRequerido(tipoCodigo) {
  if (tipoCodigo === 'CAPILLA') return 'Una capilla debe depender de una parroquia.';
  return 'Una comunidad debe depender de una parroquia o una capilla.';
}

function mensajePadreNoPermitido(tipoCodigo) {
  if (tipoCodigo === 'PARROQUIA') return 'Una parroquia no puede depender de otra sede.';
  if (tipoCodigo === 'COMUNIDAD_PASIONISTA') {
    return 'Una comunidad pasionista es una entidad aparte y no depende de otra sede.';
  }
  if (tipoCodigo === 'CAPILLA') return 'Una capilla solo puede depender de una parroquia.';
  return 'Una comunidad solo puede depender de una parroquia o una capilla.';
}

async function validarJerarquia({ id, tipoCodigo, sedePadreId, db }) {
  const permitidos = PADRES_PERMITIDOS[tipoCodigo];

  if (permitidos === null) {
    if (sedePadreId !== null) {
      throw ErrorApp.validacion(undefined, [
        { campo: 'sedePadreId', mensaje: mensajePadreNoPermitido(tipoCodigo) },
      ]);
    }
    return;
  }

  if (sedePadreId === null) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedePadreId', mensaje: mensajePadreRequerido(tipoCodigo) },
    ]);
  }

  if (id !== undefined && sedePadreId === id) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedePadreId', mensaje: 'Una sede no puede depender de sí misma.' },
    ]);
  }

  const padre = await modelo.buscarTipoDeSede(sedePadreId, db);
  if (!padre) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedePadreId', mensaje: 'La sede superior indicada no existe.' },
    ]);
  }

  const padreTipoCodigo = TIPOS_SEDE.codigoDe(padre.tipo_nombre);
  if (!permitidos.includes(padreTipoCodigo)) {
    throw ErrorApp.validacion(undefined, [
      { campo: 'sedePadreId', mensaje: mensajePadreNoPermitido(tipoCodigo) },
    ]);
  }

  if (id !== undefined && (await modelo.tieneDescendiente(sedePadreId, id, db))) {
    throw ErrorApp.validacion(undefined, [
      {
        campo: 'sedePadreId',
        mensaje: 'Una sede no puede depender de sí misma ni de una de sus descendientes.',
      },
    ]);
  }
}

function hijaCompatibleConPadre(tipoHijaCodigo, tipoPadreCodigo) {
  const permitidos = PADRES_PERMITIDOS[tipoHijaCodigo];
  return Array.isArray(permitidos) && permitidos.includes(tipoPadreCodigo);
}

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
    orden: fila.orden ?? 0,
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

export async function listarSedes(usuario, consulta = {}) {
  const tipoPrimero = TIPOS_SEDE.nombreDe('PARROQUIA');
  const pagina = consulta.pagina ?? 1;
  const porPagina = consulta.porPagina ?? 10;
  const sedeId = esAdministrador(usuario) ? undefined : usuario.sedeId;

  if (!esAdministrador(usuario) && (sedeId === null || sedeId === undefined)) {
    throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
  }

  const { filas, total } = await modelo.listarAdmin({
    tipoPrimero,
    sedeId,
    tipos: consulta.tipo?.map((codigo) => TIPOS_SEDE.nombreDe(codigo)),
    activo: consulta.activo,
    buscar: consulta.buscar,
    orden: consulta.orden,
    limite: porPagina,
    desplazamiento: desplazamiento(pagina, porPagina),
  });
  return {
    datos: filas.map(aSedeAdmin),
    paginacion: armarPaginacion({ total, pagina, porPagina }),
  };
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

  await validarJerarquia({ tipoCodigo: datos.tipo, sedePadreId: datos.sedePadreId });

  await validarRedes(datos.redesSociales);
  const configuracionFinal = fusionarConfiguracion({}, datos.configuracion);

  let idCreado;
  try {
    idCreado = await transaccion(async (db) => {
      const fila = await modelo.crear(
        {
          tipoSedeId,
          sedePadreId: datos.sedePadreId,
          orden: datos.orden,
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

  if (datos.redesSociales !== undefined) {
    await validarRedes(datos.redesSociales);
  }

  let slugObjetivo;
  try {
    await transaccion(async (db) => {
      const anterior = await modelo.filaParaModificar(id, db);
      if (!anterior) throw ErrorApp.noEncontrado('La sede no existe.');

      const tipoAnteriorRow = await modelo.obtenerTipoSedePorId(anterior.tipo_sede_id, db);
      const tipoAnteriorCodigo = TIPOS_SEDE.codigoDe(tipoAnteriorRow.nombre);
      const tipoFinalCodigo = datos.tipo ?? tipoAnteriorCodigo;
      const sedePadreFinal =
        datos.sedePadreId !== undefined ? datos.sedePadreId : anterior.sede_padre_id;

      if (datos.tipo !== undefined || datos.sedePadreId !== undefined) {
        await validarJerarquia({
          id,
          tipoCodigo: tipoFinalCodigo,
          sedePadreId: sedePadreFinal,
          db,
        });
      }

      if (datos.tipo !== undefined && tipoFinalCodigo !== tipoAnteriorCodigo) {
        const hijas = await modelo.listarHijas(id, db);
        const incompatible = hijas.some(
          (h) => !hijaCompatibleConPadre(TIPOS_SEDE.codigoDe(h.tipo_nombre), tipoFinalCodigo),
        );
        if (incompatible) {
          throw ErrorApp.conflicto(
            'No se puede cambiar el tipo porque tiene sedes dependientes que dejarían de cumplir la jerarquía.',
          );
        }
      }

      if (datos.activo === false && anterior.activo) {
        const hijas = await modelo.listarHijas(id, db);
        if (hijas.some((h) => h.activo)) {
          throw ErrorApp.conflicto(
            'No se puede desactivar una sede que tiene sedes dependientes activas. Muévelas o desactívalas primero.',
          );
        }
      }

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
        orden: datos.orden,
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

export async function obtenerArbolSedesAdmin(usuario) {
  const sedeId = esAdministrador(usuario) ? undefined : usuario.sedeId;
  if (!esAdministrador(usuario) && (sedeId === null || sedeId === undefined)) {
    throw ErrorApp.sinPermiso('Tu usuario no tiene una sede asignada.');
  }
  const filas = await modelo.listarAdminParaArbol({ sedeId });
  return armarArbolSedes(filas, aSedeAdmin);
}

export async function moverSede(id, datos, contexto) {
  await transaccion(async (db) => {
    const anterior = await modelo.filaParaModificar(id, db);
    if (!anterior) throw ErrorApp.noEncontrado('La sede no existe.');

    const tipoRow = await modelo.obtenerTipoSedePorId(anterior.tipo_sede_id, db);
    const tipoCodigo = TIPOS_SEDE.codigoDe(tipoRow.nombre);

    await validarJerarquia({
      id,
      tipoCodigo,
      sedePadreId: datos.sedePadreId,
      db,
    });

    const cambios = { sedePadreId: datos.sedePadreId };
    if (datos.orden !== undefined) {
      cambios.orden = datos.orden;
    }

    const nuevo = await modelo.actualizar(id, cambios, db);
    await registrarCambio(db, contexto, {
      entidad: 'sede',
      entidadId: id,
      accion: 'UPDATE',
      anterior,
      nuevo,
    });
  });

  return aSedeAdmin(await modelo.buscarDetalleAdminPorId(id));
}
