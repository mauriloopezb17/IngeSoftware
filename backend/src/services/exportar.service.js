// Exportación a CSV de los listados del panel CMS (PAR-159).
// Reutiliza los servicios de listado existentes para garantizar los mismos filtros, alcance por
// sede y ordenamiento, aplica el tope de 10 000 filas (422 DEMASIADOS_REGISTROS) y registra cada
// exportación en bitacora_cambio con acción EXPORT.
import { ErrorApp } from '../errores/ErrorApp.js';
import {
  fechaActualBolivia,
  formatearFechaBoliviaCsv,
  formatearFechaHoraBoliviaCsv,
  generarCsv,
} from '../utils/csv.js';
import * as adminBoletines from './adminBoletines.service.js';
import * as adminEventos from './adminEventos.service.js';
import * as adminGrupos from './adminGrupos.service.js';
import * as adminHorarios from './adminHorarios.service.js';
import * as adminPaginas from './adminPaginas.service.js';
import * as adminProclamas from './adminProclamas.service.js';
import * as adminPublicaciones from './adminPublicaciones.service.js';
import * as adminSedes from './adminSedes.service.js';
import * as adminServicios from './adminServicios.service.js';
import * as adminUsuarios from './adminUsuarios.service.js';
import * as adminVideos from './adminVideos.service.js';
import * as biblioteca from './biblioteca.service.js';
import * as bitacora from './bitacora.service.js';
import * as observacionesProclama from './observacionesProclama.service.js';

export const LIMITE_EXPORTACION = 10_000;

const DIAS_SEMANA = Object.freeze({
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
});

const RECURSOS = {
  publicaciones: {
    entidad: 'publicacion',
    archivo: 'publicaciones',
    listar: ({ usuario, sedeFiltro, consulta }) =>
      adminPublicaciones.listarPublicaciones(usuario, sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Tipo', valor: (f) => f.tipo?.nombre ?? '' },
      { encabezado: 'Estado', valor: (f) => f.estado?.nombre ?? '' },
      { encabezado: 'Título', valor: (f) => f.titulo },
      { encabezado: 'Slug', valor: (f) => f.slug },
      { encabezado: 'Categoría', valor: (f) => f.categoria?.nombre ?? '' },
      { encabezado: 'Autor', valor: (f) => f.autor?.nombreCompleto ?? '' },
      { encabezado: 'Destacada', valor: (f) => f.destacada },
      { encabezado: 'Visible en portal', valor: (f) => f.visibleEnPortal },
      {
        encabezado: 'Fecha de publicación',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaPublicacion),
      },
      {
        encabezado: 'Fecha de expiración',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaExpiracion),
      },
      {
        encabezado: 'Fecha de creación',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaCreacion),
      },
    ],
  },
  eventos: {
    entidad: 'evento',
    archivo: 'eventos',
    listar: ({ sedeFiltro, consulta }) => adminEventos.listarEventos(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Estado', valor: (f) => f.estado?.nombre ?? '' },
      { encabezado: 'Título', valor: (f) => f.titulo },
      { encabezado: 'Categoría', valor: (f) => f.categoria?.nombre ?? '' },
      { encabezado: 'Lugar', valor: (f) => f.lugar ?? '' },
      {
        encabezado: 'Fecha de inicio',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaInicio),
      },
      {
        encabezado: 'Fecha de fin',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaFin),
      },
      { encabezado: 'Todo el día', valor: (f) => f.todoElDia },
      { encabezado: 'Finalizado', valor: (f) => f.finalizado },
      { encabezado: 'Creado por', valor: (f) => f.creadoPor?.nombreCompleto ?? '' },
    ],
  },
  proclamas: {
    entidad: 'proclama',
    archivo: 'proclamas',
    listar: ({ sedeFiltro, consulta }) => adminProclamas.listarProclamas(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Contrayente 1', valor: (f) => f.contrayente1 },
      { encabezado: 'Contrayente 2', valor: (f) => f.contrayente2 },
      {
        encabezado: 'Fecha de matrimonio',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaMatrimonio),
      },
      { encabezado: 'N.º de proclama', valor: (f) => f.numeroProclama ?? '' },
      {
        encabezado: 'Fechas de publicación',
        valor: (f) =>
          (f.publicaciones ?? [])
            .map((p) => `${p.numero}.ª: ${formatearFechaBoliviaCsv(p.fecha)}`)
            .join(', '),
      },
      { encabezado: 'Vigente', valor: (f) => f.vigente },
      {
        encabezado: 'Fecha de registro',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaRegistro),
      },
    ],
  },
  observaciones: {
    entidad: 'observacion_proclama',
    archivo: 'observaciones-proclamas',
    omitirBuscarEnBitacora: true,
    listar: ({ usuario, consulta }) =>
      observacionesProclama.listarObservaciones(usuario.sedeId, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      {
        encabezado: 'Proclama',
        valor: (f) => (f.proclama ? `${f.proclama.contrayente1} y ${f.proclama.contrayente2}` : ''),
      },
      { encabezado: 'Remitente', valor: (f) => f.nombreCompleto ?? 'Anónima' },
      { encabezado: 'Correo', valor: (f) => f.correo ?? '' },
      { encabezado: 'Teléfono', valor: (f) => f.telefono ?? '' },
      { encabezado: 'Mensaje', valor: (f) => f.mensaje },
      {
        encabezado: 'Fecha de envío',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaEnvio),
      },
      { encabezado: 'Leída', valor: (f) => f.leida },
      { encabezado: 'Leída en', valor: (f) => formatearFechaHoraBoliviaCsv(f.leidoEn) },
    ],
  },
  boletines: {
    entidad: 'boletin',
    archivo: 'boletines',
    listar: ({ sedeFiltro, consulta }) => adminBoletines.listarBoletines(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Título', valor: (f) => f.titulo },
      { encabezado: 'Periodo', valor: (f) => formatearFechaBoliviaCsv(f.periodo) },
      {
        encabezado: 'Fecha de publicación',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaPublicacion),
      },
      { encabezado: 'Archivo PDF', valor: (f) => f.archivo?.nombreOriginal ?? '' },
      { encabezado: 'Publicado por', valor: (f) => f.publicadoPor?.nombreCompleto ?? '' },
    ],
  },
  multimedia: {
    entidad: 'archivo_multimedia',
    archivo: 'multimedia',
    listar: ({ sedeFiltro, consulta }) => biblioteca.listarArchivos(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Nombre original', valor: (f) => f.nombreOriginal },
      { encabezado: 'Tipo MIME', valor: (f) => f.tipoMime },
      { encabezado: 'Tamaño (bytes)', valor: (f) => f.tamanoBytes },
      { encabezado: 'Ancho (px)', valor: (f) => f.ancho ?? '' },
      { encabezado: 'Alto (px)', valor: (f) => f.alto ?? '' },
      { encabezado: 'Texto alternativo', valor: (f) => f.textoAlternativo ?? '' },
      { encabezado: 'Subido por', valor: (f) => f.subidoPor?.nombreCompleto ?? '' },
      {
        encabezado: 'Fecha de subida',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaSubida),
      },
      { encabezado: 'En uso', valor: (f) => f.enUso },
    ],
  },
  horarios: {
    entidad: 'horario',
    archivo: 'horarios',
    listar: ({ sedeFiltro, consulta }) => adminHorarios.listarHorarios(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Tipo', valor: (f) => f.tipo?.nombre ?? '' },
      { encabezado: 'Día', valor: (f) => DIAS_SEMANA[f.diaSemana] ?? String(f.diaSemana ?? '') },
      { encabezado: 'Hora de inicio', valor: (f) => f.horaInicio ?? '' },
      { encabezado: 'Hora de fin', valor: (f) => f.horaFin ?? '' },
      { encabezado: 'Descripción', valor: (f) => f.descripcion ?? '' },
      { encabezado: 'Activo', valor: (f) => f.activo },
    ],
  },
  servicios: {
    entidad: 'servicio',
    archivo: 'servicios',
    listar: ({ sedeFiltro, consulta }) => adminServicios.listarServicios(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Nombre', valor: (f) => f.nombre },
      { encabezado: 'Slug', valor: (f) => f.slug },
      { encabezado: 'Descripción corta', valor: (f) => f.descripcionCorta ?? '' },
      { encabezado: 'Orden', valor: (f) => f.orden },
      { encabezado: 'Visible', valor: (f) => f.visible },
    ],
  },
  'grupos-pastorales': {
    entidad: 'grupo_pastoral',
    archivo: 'grupos-pastorales',
    listar: ({ sedeFiltro, consulta }) => adminGrupos.listarGrupos(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Nombre', valor: (f) => f.nombre },
      { encabezado: 'Descripción', valor: (f) => f.descripcion ?? '' },
      { encabezado: 'Horario de reunión', valor: (f) => f.horarioReunion ?? '' },
      { encabezado: 'Contacto', valor: (f) => f.contacto ?? '' },
      { encabezado: 'Orden', valor: (f) => f.orden },
      { encabezado: 'Visible', valor: (f) => f.visible },
    ],
  },
  videos: {
    entidad: 'video',
    archivo: 'videos',
    listar: ({ sedeFiltro, consulta }) => adminVideos.listarVideos(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Título', valor: (f) => f.titulo },
      { encabezado: 'ID de YouTube', valor: (f) => f.youtubeVideoId },
      { encabezado: 'URL', valor: (f) => f.urlYoutube ?? '' },
      { encabezado: 'Duración (segundos)', valor: (f) => f.duracionSegundos ?? '' },
      { encabezado: 'Destacado', valor: (f) => f.destacado },
      { encabezado: 'Orden', valor: (f) => f.orden },
      {
        encabezado: 'Fecha de publicación',
        valor: (f) => formatearFechaBoliviaCsv(f.fechaPublicacion),
      },
    ],
  },
  paginas: {
    entidad: 'pagina',
    archivo: 'paginas',
    listar: ({ sedeFiltro, consulta }) => adminPaginas.listarPaginas(sedeFiltro, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? '' },
      { encabezado: 'Estado', valor: (f) => f.estado?.nombre ?? '' },
      { encabezado: 'Título', valor: (f) => f.titulo },
      { encabezado: 'Slug', valor: (f) => f.slug },
      { encabezado: 'Mostrar en menú', valor: (f) => f.mostrarEnMenu },
      { encabezado: 'Orden en menú', valor: (f) => f.ordenMenu ?? '' },
      { encabezado: 'Creado por', valor: (f) => f.creadoPor?.nombreCompleto ?? '' },
      { encabezado: 'Actualizado por', valor: (f) => f.actualizadoPor?.nombreCompleto ?? '' },
      {
        encabezado: 'Fecha de actualización',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaActualizacion),
      },
    ],
  },
  sedes: {
    entidad: 'sede',
    archivo: 'sedes',
    listar: ({ usuario, consulta }) => adminSedes.listarSedes(usuario, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Nombre', valor: (f) => f.nombre },
      { encabezado: 'Slug', valor: (f) => f.slug },
      { encabezado: 'Tipo', valor: (f) => f.tipo?.nombre ?? '' },
      { encabezado: 'Sede padre', valor: (f) => f.sedePadre?.nombre ?? '' },
      { encabezado: 'Dirección', valor: (f) => f.direccion ?? '' },
      { encabezado: 'Teléfono', valor: (f) => f.telefono ?? '' },
      { encabezado: 'WhatsApp', valor: (f) => f.whatsapp ?? '' },
      { encabezado: 'Correo', valor: (f) => f.correo ?? '' },
      { encabezado: 'Activa', valor: (f) => f.activo },
    ],
  },
  usuarios: {
    entidad: 'usuario',
    archivo: 'usuarios',
    listar: ({ sedeFiltro, consulta }) =>
      adminUsuarios.listarUsuarios(
        sedeFiltro !== undefined ? { ...consulta, sede: sedeFiltro } : consulta,
      ),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Nombre completo', valor: (f) => f.nombreCompleto },
      { encabezado: 'Correo', valor: (f) => f.correo },
      { encabezado: 'Rol', valor: (f) => f.rol?.nombre ?? '' },
      { encabezado: 'Sede', valor: (f) => f.sede?.nombre ?? 'Todas (Administrador)' },
      { encabezado: 'Activo', valor: (f) => f.activo },
      {
        encabezado: 'Último acceso',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaUltimoAcceso),
      },
      {
        encabezado: 'Fecha de creación',
        valor: (f) => formatearFechaHoraBoliviaCsv(f.fechaCreacion),
      },
    ],
  },
  bitacora: {
    entidad: 'bitacora_cambio',
    archivo: 'bitacora',
    listar: ({ usuario, consulta }) => bitacora.listarCambios(usuario, consulta),
    columnas: [
      { encabezado: 'ID', valor: (f) => f.id },
      { encabezado: 'Fecha', valor: (f) => formatearFechaHoraBoliviaCsv(f.fecha) },
      { encabezado: 'Usuario', valor: (f) => f.usuario?.nombreCompleto ?? 'Sistema' },
      { encabezado: 'Acción', valor: (f) => f.accion },
      { encabezado: 'Entidad', valor: (f) => f.entidad },
      { encabezado: 'ID de entidad', valor: (f) => f.entidadId },
      { encabezado: 'Datos anteriores', valor: (f) => f.datosAnteriores },
      { encabezado: 'Datos nuevos', valor: (f) => f.datosNuevos },
      { encabezado: 'Dirección IP', valor: (f) => f.direccionIp ?? '' },
    ],
  },
};

function filtrosParaBitacora(consulta, { omitirBuscar = false } = {}) {
  const filtros = {};
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (omitirBuscar && clave === 'buscar') continue;
    filtros[clave] = valor;
  }
  return filtros;
}

export async function exportarCsv(
  recurso,
  { usuario, sedeFiltro, consulta, contexto, limiteMaximo = LIMITE_EXPORTACION },
) {
  const definicion = RECURSOS[recurso];
  if (!definicion) {
    throw new TypeError(`Recurso de exportación desconocido: ${recurso}`);
  }

  const resultado = await definicion.listar({
    usuario,
    sedeFiltro,
    consulta: { ...consulta, pagina: 1, porPagina: limiteMaximo + 1 },
  });

  if (resultado.paginacion.total > limiteMaximo || resultado.datos.length > limiteMaximo) {
    throw ErrorApp.demasiadosRegistros();
  }

  const csv = generarCsv(definicion.columnas, resultado.datos);

  await bitacora.registrarExportacion(contexto, {
    entidad: definicion.entidad,
    filtros: filtrosParaBitacora(consulta, {
      omitirBuscar: Boolean(definicion.omitirBuscarEnBitacora),
    }),
    filas: resultado.datos.length,
  });

  return {
    csv,
    nombreArchivo: `${definicion.archivo}-${fechaActualBolivia()}.csv`,
    filas: resultado.datos.length,
  };
}
