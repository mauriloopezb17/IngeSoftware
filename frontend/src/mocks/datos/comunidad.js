// Datos mock de eventos, publicaciones (avisos y noticias), proclamas y catálogos globales.
// Las fechas de eventos, avisos y proclamas se calculan relativas a hoy (America/La_Paz, -04:00).

const DESFASE_BOLIVIA_MS = -4 * 60 * 60 * 1000;

function obtenerHoyBolivia() {
  return new Date(Date.now() + DESFASE_BOLIVIA_MS);
}

function formatearSoloFecha(fechaUtcDesfasada) {
  const anio = fechaUtcDesfasada.getUTCFullYear();
  const mes = String(fechaUtcDesfasada.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaUtcDesfasada.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaRelativaBolivia(diasOffset, hora = '00:00:00') {
  const fecha = obtenerHoyBolivia();
  fecha.setUTCDate(fecha.getUTCDate() + diasOffset);
  return `${formatearSoloFecha(fecha)}T${hora}-04:00`;
}

function soloFechaRelativa(diasOffset) {
  const fecha = obtenerHoyBolivia();
  fecha.setUTCDate(fecha.getUTCDate() + diasOffset);
  return formatearSoloFecha(fecha);
}

function proximoSabadoOffset(minDias = 7) {
  const hoy = obtenerHoyBolivia();
  const diaSemana = hoy.getUTCDay(); // 0=domingo ... 6=sábado
  const diasHastaSabado = (6 - diaSemana + 7) % 7;
  return diasHastaSabado + minDias;
}

function crearContenidoBlockNote(id, texto) {
  return {
    formato: 'blocknote',
    version: 1,
    bloques: [
      {
        id: `${id}-p1`,
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: texto, styles: {} }],
        children: [],
      },
    ],
  };
}

export const categoriasPublicacion = [
  { id: 2, nombre: 'Comunidad', slug: 'comunidad' },
  { id: 3, nombre: 'Pasionistas', slug: 'pasionistas' },
  { id: 4, nombre: 'Pastoral Familiar', slug: 'pastoral-familiar' },
  { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
];

export const categoriasEvento = [
  { id: 1, nombre: 'Liturgia', colorHex: '#E2AD11' },
  { id: 2, nombre: 'Solemnidad', colorHex: '#9E1B22' },
  { id: 3, nombre: 'Catequesis', colorHex: '#B5532F' },
  { id: 4, nombre: 'Comunidad', colorHex: '#3E9C97' },
];

export function obtenerEventosExaltacion() {
  return [
    {
      id: 1,
      titulo: 'Vigilia de Todos los Santos',
      descripcion: null,
      lugar: 'Templo parroquial',
      fechaInicio: fechaRelativaBolivia(6, '19:00:00'),
      fechaFin: null,
      todoElDia: false,
      categoria: { id: 1, nombre: 'Liturgia', colorHex: '#E2AD11' },
      imagen: null,
    },
    {
      id: 2,
      titulo: 'Todos los Santos',
      descripcion: 'Horarios: 8:00 – 10:00 – 12:00',
      lugar: 'Templo parroquial',
      fechaInicio: fechaRelativaBolivia(7, '08:00:00'),
      fechaFin: null,
      todoElDia: false,
      categoria: { id: 2, nombre: 'Solemnidad', colorHex: '#9E1B22' },
      imagen: null,
    },
    {
      id: 3,
      titulo: 'Conmemoración de los Fieles Difuntos',
      descripcion: null,
      lugar: 'Templo parroquial',
      fechaInicio: fechaRelativaBolivia(8, '19:00:00'),
      fechaFin: null,
      todoElDia: false,
      categoria: { id: 1, nombre: 'Liturgia', colorHex: '#E2AD11' },
      imagen: null,
    },
    {
      id: 4,
      titulo: 'Charla pre-bautismal para padres y padrinos',
      descripcion: null,
      lugar: 'Salón parroquial',
      fechaInicio: fechaRelativaBolivia(13, '09:30:00'),
      fechaFin: null,
      todoElDia: false,
      categoria: { id: 3, nombre: 'Catequesis', colorHex: '#B5532F' },
      imagen: null,
    },
  ];
}

export function obtenerPublicacionesExaltacion() {
  const noticias = [
    {
      id: 6,
      tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
      titulo: 'Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia',
      slug: 'encuentro-pastoral-familiar-duelo',
      resumen:
        'Un espacio para reflexionar sobre la pérdida de un ser querido y encontrar acompañamiento desde la fe. Viernes 30 de octubre a las 19:30, en el Salón San Gabriel.',
      categoria: {
        id: 4,
        nombre: 'Pastoral Familiar',
        slug: 'pastoral-familiar',
      },
      imagenPortada: {
        id: 5,
        url: '/media/seed/pastoral-familiar.jpg',
        textoAlternativo:
          'Afiche del encuentro de Pastoral Familiar sobre el duelo y la pérdida de un ser querido',
        ancho: 1137,
        alto: 1383,
      },
      urlExterna:
        'https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3',
      destacada: false,
      fechaPublicacion: '2026-10-30T12:00:00-04:00',
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'encuentro-pastoral-familiar-duelo',
        'Un espacio para reflexionar sobre la pérdida de un ser querido y encontrar acompañamiento desde la fe. Viernes 30 de octubre a las 19:30, en el Salón San Gabriel.',
      ),
    },
    {
      id: 4,
      tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
      titulo: 'Primeras comuniones: 42 niños recibieron a Jesús',
      slug: 'primeras-comuniones-42-ninos',
      resumen:
        'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
      categoria: { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
      imagenPortada: {
        id: 2,
        url: '/media/seed/crucifijo.webp',
        textoAlternativo: 'Crucifijo en el interior del templo parroquial',
        ancho: 1888,
        alto: 1059,
      },
      urlExterna: null,
      destacada: false,
      fechaPublicacion: '2026-10-18T12:00:00-04:00',
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'primeras-comuniones-42-ninos',
        'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
      ),
    },
    {
      id: 5,
      tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
      titulo: 'Encuentro de monaguillos de la Vicaría Sur',
      slug: 'encuentro-monaguillos-vicaria-sur',
      resumen:
        'Más de 60 monaguillos compartieron una jornada de formación, juego y oración.',
      categoria: { id: 2, nombre: 'Comunidad', slug: 'comunidad' },
      imagenPortada: {
        id: 1,
        url: '/media/seed/exterior-parroquia.webp',
        textoAlternativo: 'Vista exterior de la Parroquia Señor de la Exaltación',
        ancho: 1878,
        alto: 1057,
      },
      urlExterna: null,
      destacada: false,
      fechaPublicacion: '2026-10-11T12:00:00-04:00',
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'encuentro-monaguillos-vicaria-sur',
        'Más de 60 monaguillos compartieron una jornada de formación, juego y oración.',
      ),
    },
  ];

  const avisos = [
    {
      id: 1,
      tipo: { codigo: 'AVISO', nombre: 'Aviso' },
      titulo: 'Inscripciones abiertas para la catequesis de Confirmación 2027.',
      slug: 'inscripciones-confirmacion-2027',
      resumen: null,
      categoria: null,
      imagenPortada: null,
      urlExterna: null,
      destacada: false,
      fechaPublicacion: fechaRelativaBolivia(-1, '09:00:00'),
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'inscripciones-confirmacion-2027',
        'Inscripciones abiertas para la catequesis de Confirmación 2027.',
      ),
    },
    {
      id: 2,
      tipo: { codigo: 'AVISO', nombre: 'Aviso' },
      titulo: 'El 2 de noviembre la secretaría atenderá solo por la mañana.',
      slug: 'secretaria-2-de-noviembre',
      resumen: null,
      categoria: null,
      imagenPortada: null,
      urlExterna: null,
      destacada: false,
      fechaPublicacion: fechaRelativaBolivia(-3, '09:00:00'),
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'secretaria-2-de-noviembre',
        'El 2 de noviembre la secretaría atenderá solo por la mañana.',
      ),
    },
    {
      id: 3,
      tipo: { codigo: 'AVISO', nombre: 'Aviso' },
      titulo: 'Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.',
      slug: 'donaciones-viveres-pastoral-social',
      resumen: null,
      categoria: null,
      imagenPortada: null,
      urlExterna: null,
      destacada: false,
      fechaPublicacion: fechaRelativaBolivia(-5, '09:00:00'),
      fechaExpiracion: null,
      contenido: crearContenidoBlockNote(
        'donaciones-viveres-pastoral-social',
        'Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.',
      ),
    },
  ];

  return [...avisos, ...noticias];
}

export function obtenerProclamasExaltacion() {
  const baseSabado = proximoSabadoOffset(7);

  return [
    {
      id: 1,
      contrayente1: 'Juan Carlos M. Q.',
      contrayente2: 'María Fernanda R. V.',
      fechaMatrimonio: fechaRelativaBolivia(baseSabado, '11:00:00'),
      numeroProclama: 3,
      publicaciones: [
        { numero: 1, fecha: soloFechaRelativa(-14) },
        { numero: 2, fecha: soloFechaRelativa(-7) },
        { numero: 3, fecha: soloFechaRelativa(0) },
      ],
    },
    {
      id: 2,
      contrayente1: 'Diego A. Choque L.',
      contrayente2: 'Camila S. Paredes',
      fechaMatrimonio: fechaRelativaBolivia(baseSabado + 7, '16:00:00'),
      numeroProclama: 2,
      publicaciones: [
        { numero: 1, fecha: soloFechaRelativa(-7) },
        { numero: 2, fecha: soloFechaRelativa(0) },
      ],
    },
    {
      id: 3,
      contrayente1: 'Luis F. Gutiérrez',
      contrayente2: 'Andrea Mamani C.',
      fechaMatrimonio: fechaRelativaBolivia(baseSabado + 21, '12:00:00'),
      numeroProclama: 1,
      publicaciones: [{ numero: 1, fecha: soloFechaRelativa(0) }],
    },
  ];
}
