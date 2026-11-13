// Reglas y armado de las respuestas de sedes (contrato: docs/api/publico.md).
// Las funciones reciben solo datos simples (slug, id) y devuelven el objeto del contrato:
// así la caché de la Ola 5 se puede poner encima sin cambiar los controladores.
import { TIPOS_SEDE } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as modelo from '../models/sedes.model.js';
import { aCamelCase, imagen } from '../utils/formato.js';
import { slug as esquemaSlug } from '../validacion/comunes.js';

function imagenPortada(fila) {
  return imagen({
    id: fila.imagen_id,
    url: fila.url_imagen_portada,
    textoAlternativo: fila.imagen_texto_alternativo,
    ancho: fila.imagen_ancho,
    alto: fila.imagen_alto,
  });
}

function aResumen(fila) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    slug: fila.slug,
    tipo: TIPOS_SEDE.aEnumeracion(fila.tipo_nombre),
    sedePadre: fila.sede_padre,
    direccion: fila.direccion,
    imagenPortada: imagenPortada(fila),
    enlaceComoLlegar: fila.configuracion?.enlace_como_llegar ?? null,
  };
}

function aDetalle(fila) {
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
    imagenPortada: imagenPortada(fila),
    redesSociales: fila.redes_sociales,
    // Único JSONB sin esquema propio que se traduce a camelCase (convenciones §2).
    configuracion: aCamelCase(fila.configuracion ?? {}),
  };
}

// GET /api/sedes: sedes activas, parroquias primero.
export async function listarSedes() {
  const filas = await modelo.listarActivas({ tipoPrimero: TIPOS_SEDE.nombreDe('PARROQUIA') });
  return filas.map(aResumen);
}

// Sede activa a partir del slug de la URL, o 404 con el mensaje del contrato.
// Un slug con formato imposible (mayúsculas, espacios…) también es 404: no puede existir.
export async function resolverSedeActiva(slug) {
  const sede = esquemaSlug.safeParse(slug).success ? await modelo.buscarActivaPorSlug(slug) : null;

  if (!sede) {
    throw ErrorApp.noEncontrado(`No existe la sede «${String(slug).slice(0, 120)}».`);
  }
  return sede;
}

// GET /api/sedes/:sede: datos, contacto, redes sociales y configuración.
export async function obtenerSede(sedeId) {
  const fila = await modelo.obtenerDetalle(sedeId);
  if (!fila) {
    throw ErrorApp.noEncontrado('No existe la sede.');
  }
  return aDetalle(fila);
}
