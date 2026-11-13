// Lógica de las publicaciones simuladas del panel: estado en memoria, filtros, validaciones, permisos
// por rol y máquina de estados (docs/api/admin.md §3, estados-publicacion.md y contenido.md).
// Los handlers de publicacionesHandlers.js solo la usan.
//
// Los permisos se leen de `usuario.permisos` (los de la sesión simulada), no de permisos/matriz.js:
// el mock hace de servidor, y así una prueba detecta si ambos dejan de coincidir.
import { buscarArchivo, buscarArchivoPorUrl } from './multimediaMock.js';
import {
  CATEGORIAS,
  crearPublicacionesIniciales,
  ESTADOS,
  SIGUIENTE_ID_INICIAL,
  TIPOS,
} from './publicacionesDatos.js';
import { fechaBolivia } from './usuarios.js';

let publicaciones = crearPublicacionesIniciales();
let siguienteId = SIGUIENTE_ID_INICIAL;

export function reiniciarPublicaciones() {
  publicaciones = crearPublicacionesIniciales();
  siguienteId = SIGUIENTE_ID_INICIAL;
}

export const buscarPublicacion = (id) => publicaciones.find((p) => p.id === id) ?? null;

// ---- Permisos ----

const permisoPublicar = (tipo) => (tipo === 'AVISO' ? 'avisos.gestionar' : 'noticias.publicar');
const permisoRedactar = (tipo) => (tipo === 'AVISO' ? 'avisos.gestionar' : 'noticias.redactar');
const tiene = (usuario, permiso) => usuario.permisos.includes(permiso);

function rolesSobre(pub, usuario) {
  const tipo = pub.tipo.codigo;
  return {
    publica: tiene(usuario, permisoPublicar(tipo)),
    redacta: tiene(usuario, permisoRedactar(tipo)),
    esAutor: pub.autor.id === usuario.id,
  };
}

// Acciones que la sesión puede hacer ahora sobre la publicación (estados-publicacion.md §3, §5 y §6).
export function accionesDe(pub, usuario) {
  const { publica, redacta, esAutor } = rolesSobre(pub, usuario);
  const acciones = [];

  switch (pub.estado.codigo) {
    case 'BORRADOR':
      if (publica || (redacta && esAutor)) acciones.push('EDITAR', 'ELIMINAR');
      // Quien puede publicar no necesita pasar por revisión.
      if (pub.tipo.codigo !== 'AVISO' && redacta && esAutor && !publica) acciones.push('ENVIAR_REVISION');
      if (publica) acciones.push('PUBLICAR');
      break;
    case 'EN_REVISION':
      if (publica) acciones.push('EDITAR', 'APROBAR', 'RECHAZAR');
      break;
    case 'PUBLICADO':
      if (publica) acciones.push('EDITAR', 'ARCHIVAR');
      break;
    case 'ARCHIVADO':
      if (publica) acciones.push('RESTAURAR', 'ELIMINAR');
      break;
    default:
  }
  return acciones;
}

// ---- Utilidades ----

const ahora = () => new Date();
const iso = (fecha) => fechaBolivia(fecha);
const esFechaValida = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor));

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const generarSlug = (titulo) =>
  normalizar(titulo)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'publicacion';

const slugLibre = (slug, idPropio) => !publicaciones.some((p) => p.slug === slug && p.id !== idPropio);

function slugUnico(base) {
  let candidato = base;
  for (let n = 2; !slugLibre(candidato); n += 1) candidato = `${base}-${n}`;
  return candidato;
}

const error = (estado, codigo, mensaje, detalles = []) => ({ error: { estado, codigo, mensaje, detalles } });
const errorValidacion = (detalles, mensaje = 'Los datos enviados no son válidos.') =>
  error(400, 'VALIDACION', mensaje, detalles);
const sinPermiso = (mensaje) => error(403, 'SIN_PERMISO', mensaje);
const conflicto = (mensaje) => error(409, 'CONFLICTO', mensaje);

function imagenDeBiblioteca(id) {
  const archivo = buscarArchivo(id);
  if (!archivo || !archivo.tipoMime.startsWith('image/')) return null;
  return {
    id: archivo.id,
    url: archivo.url,
    textoAlternativo: archivo.textoAlternativo ?? null,
    ancho: archivo.ancho ?? null,
    alto: archivo.alto ?? null,
  };
}

function visibleEnPortal(pub) {
  if (pub.estado.codigo !== 'PUBLICADO' || !pub.fechaPublicacion) return false;
  const t = ahora().getTime();
  return (
    new Date(pub.fechaPublicacion).getTime() <= t &&
    (!pub.fechaExpiracion || new Date(pub.fechaExpiracion).getTime() > t)
  );
}

// Objeto publicación de la vista del panel. En la lista no se incluye `contenido`.
export function serializar(pub, usuario, { conContenido = true } = {}) {
  const { imagenPortadaId, contenido, ...resto } = pub;
  const salida = {
    ...resto,
    imagenPortada: imagenPortadaId ? imagenDeBiblioteca(imagenPortadaId) : null,
    visibleEnPortal: visibleEnPortal(pub),
    acciones: accionesDe(pub, usuario),
  };
  if (conContenido) salida.contenido = contenido;
  return salida;
}

// ---- Contenido BlockNote (contenido.md) ----

const BLOQUES_DE_TEXTO = ['paragraph', 'heading', 'bulletListItem', 'numberedListItem', 'quote'];
const BLOQUES_PERMITIDOS = [...BLOQUES_DE_TEXTO, 'image', 'video'];
const BLOQUES_CON_HIJOS = ['bulletListItem', 'numberedListItem'];
const ESTILOS_PERMITIDOS = ['bold', 'italic', 'underline', 'strike', 'textColor', 'backgroundColor'];
const ESQUEMA_ENLACE = /^(https:\/\/|http:\/\/|mailto:|tel:|\/|#)/;
const MAX_BLOQUES = 500;
const MAX_BYTES_DOCUMENTO = 512 * 1024;
const PROFUNDIDAD_MAXIMA = 3;

function textoDe(bloque) {
  return (bloque.content ?? [])
    .map((en_linea) => (en_linea.type === 'link' ? textoDe(en_linea) : (en_linea.text ?? '')))
    .join('')
    .trim();
}

// Un documento solo de párrafos vacíos cuenta como «sin contenido».
export const sinContenido = (contenido) =>
  (contenido?.bloques ?? []).every(
    (b) => b.type === 'paragraph' && textoDe(b) === '' && !(b.children ?? []).length,
  );

function validarContenido(contenido, detalles) {
  const mal = (mensaje, campo = 'contenido.bloques') => detalles.push({ campo, mensaje });

  if (
    !contenido ||
    typeof contenido !== 'object' ||
    contenido.formato !== 'blocknote' ||
    contenido.version !== 1 ||
    !Array.isArray(contenido.bloques)
  ) {
    mal('Debe ser un documento BlockNote: { formato: "blocknote", version: 1, bloques: [...] }.', 'contenido');
    return;
  }
  if (JSON.stringify(contenido).length > MAX_BYTES_DOCUMENTO) mal('El contenido no puede pasar de 512 KB.');

  let total = 0;
  const recorrer = (bloques, profundidad) => {
    for (const bloque of bloques) {
      total += 1;
      const tipo = bloque?.type;
      if (!BLOQUES_PERMITIDOS.includes(tipo)) {
        mal(`El bloque «${tipo}» no está permitido.`);
        continue;
      }
      if (tipo === 'heading' && ![2, 3].includes(bloque.props?.level)) mal('Los títulos solo pueden ser de nivel 2 o 3.');
      if (tipo === 'heading' && bloque.props?.isToggleable) mal('Los títulos no pueden ser desplegables.');

      if (tipo === 'image' || tipo === 'video') {
        const url = bloque.props?.url;
        if (!url) mal(`El bloque «${tipo}» necesita una url.`);
        else if (!buscarArchivoPorUrl(url)) mal('La url debe ser de un archivo de la biblioteca multimedia de la sede.');
        if (bloque.content?.length) mal(`El bloque «${tipo}» no admite contenido en línea.`);
      }

      for (const en_linea of bloque.content ?? []) {
        if (!['text', 'link'].includes(en_linea.type)) mal('El contenido en línea solo puede ser texto o enlace.');
        if (en_linea.type === 'link' && !ESQUEMA_ENLACE.test(en_linea.href ?? ''))
          mal('El enlace debe empezar con https://, http://, mailto:, tel:, / o #.');
        const estilos = en_linea.type === 'link' ? {} : (en_linea.styles ?? {});
        for (const estilo of Object.keys(estilos))
          if (!ESTILOS_PERMITIDOS.includes(estilo)) mal(`El estilo «${estilo}» no está permitido.`);
      }

      const hijos = bloque.children ?? [];
      if (hijos.length && !BLOQUES_CON_HIJOS.includes(tipo)) mal('Solo los elementos de lista pueden tener bloques anidados.');
      else if (hijos.length && profundidad >= PROFUNDIDAD_MAXIMA) mal('La profundidad máxima de anidación es 3.');
      else recorrer(hijos, profundidad + 1);
    }
  };
  recorrer(contenido.bloques, 1);
  if (total > MAX_BLOQUES) mal('El documento puede tener hasta 500 bloques.');
}

// ---- Validación de campos (crear y editar) ----

// `parcial`: en un PATCH solo se validan los campos enviados. `null` borra un campo opcional.
function validarCampos(cuerpo, { parcial, sede }) {
  const detalles = [];
  const mal = (campo, mensaje) => detalles.push({ campo, mensaje });
  const enviado = (campo) => !parcial || campo in cuerpo;
  const opcional = (campo) => campo in cuerpo && cuerpo[campo] !== null;

  if (enviado('titulo')) {
    const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo.trim() : '';
    if (titulo.length < 3 || titulo.length > 200) mal('titulo', 'El título debe tener entre 3 y 200 caracteres.');
  }
  if (opcional('slug') && (typeof cuerpo.slug !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cuerpo.slug) || cuerpo.slug.length > 200))
    mal('slug', 'Solo minúsculas, números y guiones, hasta 200 caracteres.');
  if (opcional('resumen') && (typeof cuerpo.resumen !== 'string' || cuerpo.resumen.length > 400))
    mal('resumen', 'El resumen puede tener hasta 400 caracteres.');
  if (opcional('categoriaId') && !CATEGORIAS.some((c) => c.id === cuerpo.categoriaId))
    mal('categoriaId', 'La categoría no existe.');
  if (opcional('imagenPortadaId')) {
    const archivo = buscarArchivo(cuerpo.imagenPortadaId);
    if (!archivo || !archivo.tipoMime.startsWith('image/') || archivo.sede.id !== sede.id)
      mal('imagenPortadaId', 'La imagen de portada debe ser una imagen de la biblioteca de la sede.');
  }
  if (enviado('contenido')) validarContenido(cuerpo.contenido, detalles);
  if (opcional('urlExterna') && (typeof cuerpo.urlExterna !== 'string' || !/^https:\/\/\S+$/.test(cuerpo.urlExterna) || cuerpo.urlExterna.length > 500))
    mal('urlExterna', 'Debe ser una URL https:// de hasta 500 caracteres.');
  if ('destacada' in cuerpo && typeof cuerpo.destacada !== 'boolean') mal('destacada', 'Debe ser verdadero o falso.');
  for (const campo of ['fechaPublicacion', 'fechaExpiracion'])
    if (opcional(campo) && !esFechaValida(cuerpo[campo])) mal(campo, 'Debe ser una fecha y hora válidas.');

  return detalles;
}

// ---- Requisitos para salir de BORRADOR (estados-publicacion.md §3) ----

// Fecha efectiva de publicación (§4): la del cuerpo, o la deseada, o ahora; si ya pasó, ahora.
function fechaEfectiva(pub, cuerpo = {}) {
  const ya = ahora();
  const candidata = cuerpo.fechaPublicacion ?? pub.fechaPublicacion;
  const fecha = candidata ? new Date(candidata) : ya;
  return fecha < ya ? ya : fecha;
}

function requisitosFaltantes(pub, efectiva) {
  const detalles = [];
  const titulo = pub.titulo.trim();
  if (titulo.length < 3 || titulo.length > 200)
    detalles.push({ campo: 'titulo', mensaje: 'El título debe tener entre 3 y 200 caracteres.' });
  if (pub.tipo.codigo !== 'AVISO' && sinContenido(pub.contenido) && !pub.urlExterna)
    detalles.push({ campo: 'contenido.bloques', mensaje: 'Agrega contenido o un enlace externo.' });
  if (pub.imagenPortadaId && !imagenDeBiblioteca(pub.imagenPortadaId)?.textoAlternativo)
    detalles.push({ campo: 'imagenPortadaId', mensaje: 'La imagen de portada necesita un texto alternativo.' });
  if (pub.fechaExpiracion) {
    const expira = new Date(pub.fechaExpiracion);
    if (expira <= efectiva || expira <= ahora())
      detalles.push({
        campo: 'fechaExpiracion',
        mensaje: 'La expiración debe ser posterior a la fecha de publicación y a este momento.',
      });
  }
  return detalles;
}

const noEstaLista = (detalles) => errorValidacion(detalles, 'La publicación no está lista para publicarse.');

// ---- Listado ----

const ORDENES = {
  fechaCreacion: (a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion),
  fechaPublicacion: (a, b) => (a.fechaPublicacion ?? '').localeCompare(b.fechaPublicacion ?? ''),
  titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'es'),
};

// Devuelve { datos, paginacion } o { detalles } si un parámetro conocido es inválido.
export function listarPublicaciones(parametros, usuario, { slugSede } = {}) {
  const detalles = [];
  const valores = (nombre, permitidos) => {
    const lista = (parametros.get(nombre) ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    const invalidos = lista.filter((v) => !(v in permitidos));
    if (invalidos.length)
      detalles.push({ campo: `query.${nombre}`, mensaje: `Valores permitidos: ${Object.keys(permitidos).join(', ')}.` });
    return lista;
  };
  const tipos = valores('tipo', TIPOS);
  const estados = valores('estado', ESTADOS);

  let autorId = null;
  const autor = parametros.get('autor');
  if (autor === 'yo') autorId = usuario.id;
  else if (autor) {
    autorId = Number(autor);
    if (!Number.isInteger(autorId)) detalles.push({ campo: 'query.autor', mensaje: 'Debe ser un id o «yo».' });
  }

  const pagina = parametros.has('pagina') ? Number(parametros.get('pagina')) : 1;
  if (!Number.isInteger(pagina) || pagina < 1)
    detalles.push({ campo: 'query.pagina', mensaje: 'Debe ser un entero mayor o igual a 1.' });
  const porPagina = parametros.has('porPagina') ? Number(parametros.get('porPagina')) : 10;
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 50)
    detalles.push({ campo: 'query.porPagina', mensaje: 'Debe ser un entero entre 1 y 50.' });
  const orden = parametros.get('orden') ?? '-fechaCreacion';
  const campoOrden = orden.replace(/^-/, '');
  if (!(campoOrden in ORDENES)) detalles.push({ campo: 'query.orden', mensaje: 'Orden no válido.' });

  if (detalles.length) return { detalles };

  const categoria = parametros.get('categoria');
  const buscar = normalizar(parametros.get('buscar')?.trim());
  let resultado = publicaciones.filter(
    (p) =>
      (!slugSede || p.sede.slug === slugSede) &&
      (!tipos.length || tipos.includes(p.tipo.codigo)) &&
      (!estados.length || estados.includes(p.estado.codigo)) &&
      (!categoria || p.categoria?.slug === categoria) &&
      (autorId === null || p.autor.id === autorId) &&
      (!buscar || normalizar(p.titulo).includes(buscar) || normalizar(p.resumen).includes(buscar)),
  );

  resultado = [...resultado].sort(ORDENES[campoOrden]);
  if (orden.startsWith('-')) resultado.reverse();

  const total = resultado.length;
  const inicio = (pagina - 1) * porPagina;
  return {
    datos: resultado.slice(inicio, inicio + porPagina).map((p) => serializar(p, usuario, { conContenido: false })),
    paginacion: { pagina, porPagina, total, totalPaginas: Math.ceil(total / porPagina) },
  };
}

// ---- Crear, editar y eliminar ----

function aplicarCampos(pub, cuerpo) {
  if ('titulo' in cuerpo) pub.titulo = cuerpo.titulo.trim();
  if ('resumen' in cuerpo) pub.resumen = cuerpo.resumen || null;
  if ('categoriaId' in cuerpo)
    pub.categoria = cuerpo.categoriaId === null ? null : CATEGORIAS.find((c) => c.id === cuerpo.categoriaId);
  if ('imagenPortadaId' in cuerpo) pub.imagenPortadaId = cuerpo.imagenPortadaId;
  if ('contenido' in cuerpo) pub.contenido = cuerpo.contenido;
  if ('urlExterna' in cuerpo) pub.urlExterna = cuerpo.urlExterna;
  if ('destacada' in cuerpo) pub.destacada = cuerpo.destacada;
  if ('fechaPublicacion' in cuerpo)
    pub.fechaPublicacion = cuerpo.fechaPublicacion ? iso(new Date(cuerpo.fechaPublicacion)) : null;
  if ('fechaExpiracion' in cuerpo)
    pub.fechaExpiracion = cuerpo.fechaExpiracion ? iso(new Date(cuerpo.fechaExpiracion)) : null;
}

const expiraAntesDePublicar = (pub) =>
  pub.fechaPublicacion &&
  pub.fechaExpiracion &&
  new Date(pub.fechaExpiracion) <= new Date(pub.fechaPublicacion)
    ? [{ campo: 'fechaExpiracion', mensaje: 'La expiración debe ser posterior a la fecha de publicación.' }]
    : [];

// Devuelve { publicacion } o { error }.
export function crearPublicacion(cuerpo, usuario) {
  const tipo = TIPOS[cuerpo?.tipo];
  if (!tipo) return errorValidacion([{ campo: 'tipo', mensaje: 'Debe ser AVISO, NOTICIA o NOTA_DE_PRENSA.' }]);
  if (!tiene(usuario, permisoRedactar(tipo.codigo)))
    return sinPermiso(
      tipo.codigo === 'AVISO'
        ? 'Tu rol no tiene permiso para crear avisos.'
        : 'Tu rol no tiene permiso para crear noticias.',
    );

  const sede = usuario.sede;
  const detalles = validarCampos(cuerpo, { parcial: false, sede });
  const nueva = {
    id: siguienteId,
    sede,
    tipo,
    estado: ESTADOS.BORRADOR,
    slug: null,
    resumen: null,
    categoria: null,
    imagenPortadaId: null,
    urlExterna: null,
    destacada: false,
    fechaPublicacion: null,
    fechaExpiracion: null,
    revision: null,
    autor: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
    fechaCreacion: iso(ahora()),
  };
  if (!detalles.length) {
    aplicarCampos(nueva, cuerpo);
    detalles.push(...expiraAntesDePublicar(nueva));
  }
  if (detalles.length) return errorValidacion(detalles);

  if (cuerpo.slug) {
    if (!slugLibre(cuerpo.slug)) return conflicto('Ya existe una publicación con ese slug en la sede.');
    nueva.slug = cuerpo.slug;
  } else {
    nueva.slug = slugUnico(generarSlug(nueva.titulo));
  }

  siguienteId += 1;
  publicaciones.push(nueva);
  return { publicacion: nueva };
}

export function editarPublicacion(pub, cuerpo, usuario) {
  const { publica, redacta, esAutor } = rolesSobre(pub, usuario);
  const estado = pub.estado.codigo;

  if ('tipo' in cuerpo && cuerpo.tipo !== pub.tipo.codigo)
    return errorValidacion([{ campo: 'tipo', mensaje: 'El tipo de una publicación no se puede cambiar.' }]);
  if (estado === 'ARCHIVADO') return conflicto('Una publicación archivada no se puede editar. Restáurala primero.');
  if (estado === 'BORRADOR' && !(publica || (redacta && esAutor)))
    return sinPermiso('Solo puedes editar tus propios borradores.');
  if ((estado === 'EN_REVISION' || estado === 'PUBLICADO') && !publica)
    return sinPermiso(
      estado === 'EN_REVISION'
        ? 'No puedes editar una publicación mientras está en revisión.'
        : 'Tu rol no tiene permiso para editar publicaciones publicadas.',
    );

  const detalles = validarCampos(cuerpo, { parcial: true, sede: pub.sede });
  if (detalles.length) return errorValidacion(detalles);

  if ('slug' in cuerpo && cuerpo.slug !== null && cuerpo.slug !== pub.slug) {
    if (estado === 'PUBLICADO')
      return conflicto('El slug de una publicación publicada no se puede cambiar, para no romper sus enlaces.');
    if (!slugLibre(cuerpo.slug, pub.id)) return conflicto('Ya existe una publicación con ese slug en la sede.');
  }

  const copia = { ...pub };
  aplicarCampos(copia, cuerpo);
  const fechas = expiraAntesDePublicar(copia);
  if (fechas.length) return errorValidacion(fechas);

  Object.assign(pub, copia);
  if ('slug' in cuerpo && cuerpo.slug !== null) pub.slug = cuerpo.slug;
  return { publicacion: pub };
}

export function eliminarPublicacion(pub, usuario) {
  const { publica, redacta, esAutor } = rolesSobre(pub, usuario);
  const estado = pub.estado.codigo;

  if (estado === 'EN_REVISION' || estado === 'PUBLICADO')
    return conflicto(
      `Una publicación en «${pub.estado.nombre}» no se puede eliminar: ${
        estado === 'EN_REVISION' ? 'primero hay que rechazarla' : 'primero hay que archivarla'
      }.`,
    );
  const puede = estado === 'BORRADOR' ? publica || (redacta && esAutor) : publica;
  if (!puede) return sinPermiso('Tu rol no tiene permiso para eliminar esta publicación.');

  publicaciones = publicaciones.filter((p) => p.id !== pub.id);
  return { eliminada: true };
}

// ---- Acciones de estado (estados-publicacion.md §3) ----

const solo = (verbo, esperado, pub) =>
  conflicto(`Solo se pueden ${verbo} publicaciones ${esperado}. Esta está en «${pub.estado.nombre}».`);

function revisadoPor(pub, usuario, observacion) {
  pub.revision = {
    revisadoPor: { id: usuario.id, nombreCompleto: usuario.nombreCompleto },
    fecha: iso(ahora()),
    observacion,
  };
}

// `nombre`: enviar-revision, aprobar, rechazar, publicar, archivar o restaurar.
// Orden de las comprobaciones: permiso (403), estado (409) y datos (400).
export function ejecutarAccion(nombre, pub, cuerpo, usuario) {
  const { publica, redacta, esAutor } = rolesSobre(pub, usuario);
  const estado = pub.estado.codigo;
  const datos = cuerpo && typeof cuerpo === 'object' ? cuerpo : {};

  switch (nombre) {
    case 'enviar-revision': {
      if (pub.tipo.codigo === 'AVISO') return conflicto('Los avisos no pasan por revisión: se publican directamente.');
      if (!redacta) return sinPermiso('Tu rol no tiene permiso para enviar publicaciones a revisión.');
      if (!esAutor) return sinPermiso('Solo el autor puede enviar su borrador a revisión.');
      if (estado !== 'BORRADOR') return solo('enviar a revisión', 'en borrador', pub);
      const faltan = requisitosFaltantes(pub, fechaEfectiva(pub));
      if (faltan.length) return noEstaLista(faltan);
      pub.estado = ESTADOS.EN_REVISION;
      return { publicacion: pub };
    }

    case 'aprobar': {
      if (!publica) return sinPermiso('Tu rol no tiene permiso para aprobar publicaciones.');
      if (estado !== 'EN_REVISION') return solo('aprobar', 'en revisión', pub);
      if ('fechaPublicacion' in datos && datos.fechaPublicacion !== null && !esFechaValida(datos.fechaPublicacion))
        return errorValidacion([{ campo: 'fechaPublicacion', mensaje: 'Debe ser una fecha y hora válidas.' }]);
      const efectiva = fechaEfectiva(pub, datos);
      const faltan = requisitosFaltantes(pub, efectiva);
      if (faltan.length) return noEstaLista(faltan);
      pub.estado = ESTADOS.PUBLICADO;
      pub.fechaPublicacion = iso(efectiva);
      revisadoPor(pub, usuario, null);
      return { publicacion: pub };
    }

    case 'rechazar': {
      if (!publica) return sinPermiso('Tu rol no tiene permiso para rechazar publicaciones.');
      if (estado !== 'EN_REVISION') return solo('rechazar', 'en revisión', pub);
      const observacion = typeof datos.observacion === 'string' ? datos.observacion.trim() : '';
      if (observacion.length < 5 || observacion.length > 500)
        return errorValidacion([
          { campo: 'observacion', mensaje: 'La observación es obligatoria, de 5 a 500 caracteres.' },
        ]);
      pub.estado = ESTADOS.BORRADOR;
      revisadoPor(pub, usuario, observacion);
      return { publicacion: pub };
    }

    case 'publicar': {
      if (!publica) return sinPermiso('Tu rol no tiene permiso para publicar.');
      if (estado !== 'BORRADOR') return solo('publicar', 'en borrador', pub);
      const detalles = [];
      for (const campo of ['fechaPublicacion', 'fechaExpiracion'])
        if (campo in datos && datos[campo] !== null && !esFechaValida(datos[campo]))
          detalles.push({ campo, mensaje: 'Debe ser una fecha y hora válidas.' });
      if (detalles.length) return errorValidacion(detalles);

      const efectiva = fechaEfectiva(pub, datos);
      const candidata = { ...pub };
      if ('fechaExpiracion' in datos) candidata.fechaExpiracion = datos.fechaExpiracion;
      const faltan = requisitosFaltantes(candidata, efectiva);
      if (faltan.length) return noEstaLista(faltan);
      pub.estado = ESTADOS.PUBLICADO;
      pub.fechaPublicacion = iso(efectiva);
      if ('fechaExpiracion' in datos)
        pub.fechaExpiracion = datos.fechaExpiracion ? iso(new Date(datos.fechaExpiracion)) : null;
      return { publicacion: pub };
    }

    case 'archivar': {
      if (!publica) return sinPermiso('Tu rol no tiene permiso para archivar publicaciones.');
      if (estado !== 'PUBLICADO') return solo('archivar', 'publicadas', pub);
      pub.estado = ESTADOS.ARCHIVADO;
      return { publicacion: pub };
    }

    case 'restaurar': {
      if (!publica) return sinPermiso('Tu rol no tiene permiso para restaurar publicaciones.');
      if (estado !== 'ARCHIVADO') return solo('restaurar', 'archivadas', pub);
      pub.estado = ESTADOS.BORRADOR;
      return { publicacion: pub };
    }

    default:
      return error(404, 'NO_ENCONTRADO', 'La acción no existe.');
  }
}
