// Datos iniciales del contenido de la parroquia (docs/api/admin.md §1, §5-§9 y database/seed).
import { videosExaltacion } from '../../../mocks/datos/parroquia.js';
import { buscarArchivo } from '../../mocks/multimediaMock.js';
import { SEDE_PRINCIPAL } from '../../mocks/usuarios.js';

export const CATALOGOS = {
  roles: [
    { id: 1, codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
    { id: 2, codigo: 'PARROCO', nombre: 'Párroco' },
    { id: 3, codigo: 'SECRETARIA', nombre: 'Secretaría' },
    { id: 4, codigo: 'MARKETING', nombre: 'Marketing' },
  ],
  tiposSede: [
    { id: 1, codigo: 'PARROQUIA', nombre: 'Parroquia' },
    { id: 2, codigo: 'CAPILLA', nombre: 'Capilla' },
  ],
  estadosPublicacion: [
    { id: 1, codigo: 'BORRADOR', nombre: 'Borrador' },
    { id: 4, codigo: 'EN_REVISION', nombre: 'En revisión' },
    { id: 2, codigo: 'PUBLICADO', nombre: 'Publicado' },
    { id: 3, codigo: 'ARCHIVADO', nombre: 'Archivado' },
  ],
  tiposPublicacion: [
    { id: 1, codigo: 'NOTICIA', nombre: 'Noticia' },
    { id: 2, codigo: 'AVISO', nombre: 'Aviso' },
    { id: 3, codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' },
  ],
  categorias: [
    { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
    { id: 2, nombre: 'Comunidad', slug: 'comunidad' },
    { id: 3, nombre: 'Pasionistas', slug: 'pasionistas' },
    { id: 4, nombre: 'Pastoral Familiar', slug: 'pastoral-familiar' },
  ],
  categoriasEvento: [
    { id: 1, nombre: 'Liturgia', colorHex: '#E2AD11' },
    { id: 2, nombre: 'Solemnidad', colorHex: '#9E1B22' },
    { id: 3, nombre: 'Catequesis', colorHex: '#B5532F' },
    { id: 4, nombre: 'Comunidad', colorHex: '#3E9C97' },
  ],
  tiposHorario: [
    { id: 1, nombre: 'Santa Misa' },
    { id: 2, nombre: 'Confesiones' },
    { id: 3, nombre: 'Adoración' },
    { id: 4, nombre: 'Secretaría' },
  ],
  redesSociales: [
    { id: 1, nombre: 'Facebook', icono: 'facebook' },
    { id: 2, nombre: 'Instagram', icono: 'instagram' },
    { id: 3, nombre: 'YouTube', icono: 'youtube' },
    { id: 4, nombre: 'TikTok', icono: 'tiktok' },
    { id: 5, nombre: 'WhatsApp', icono: 'chat' },
  ],
  tiposBloque: [
    {
      id: 1,
      codigo: 'hero_video',
      nombre: 'Portada con video',
      esquemaValidacion: {
        type: 'object',
        required: ['titulo', 'url_video'],
        properties: {
          titulo: { type: 'string' },
          subtitulo: { type: 'string' },
          url_video: { type: 'string' },
          url_poster: { type: 'string' },
          botones: { type: 'array' },
        },
      },
    },
    {
      id: 2,
      codigo: 'texto_imagen',
      nombre: 'Texto con imagen',
      esquemaValidacion: {
        type: 'object',
        required: ['titulo', 'texto'],
        properties: {
          titulo: { type: 'string' },
          texto: { type: 'string' },
          url_imagen: { type: 'string' },
          posicion_imagen: { enum: ['izquierda', 'derecha'] },
        },
      },
    },
    {
      id: 3,
      codigo: 'tarjetas',
      nombre: 'Grilla de tarjetas',
      esquemaValidacion: {
        type: 'object',
        required: ['items'],
        properties: {
          titulo: { type: 'string' },
          items: { type: 'array' },
        },
      },
    },
    {
      id: 4,
      codigo: 'cita',
      nombre: 'Cita destacada',
      esquemaValidacion: {
        type: 'object',
        required: ['texto'],
        properties: {
          texto: { type: 'string' },
          autor: { type: 'string' },
        },
      },
    },
    {
      id: 5,
      codigo: 'galeria',
      nombre: 'Galería de fotos',
      esquemaValidacion: {
        type: 'object',
        required: ['imagenes'],
        properties: {
          imagenes: { type: 'array' },
        },
      },
    },
    {
      id: 6,
      codigo: 'video_youtube',
      nombre: 'Video de YouTube',
      esquemaValidacion: {
        type: 'object',
        required: ['youtube_video_id'],
        properties: {
          youtube_video_id: { type: 'string' },
        },
      },
    },
  ],
};

export function crearSedesIniciales() {
  return [
    {
      id: 1,
      nombre: 'Parroquia Señor de la Exaltación',
      slug: 'senor-de-la-exaltacion',
      tipo: { codigo: 'PARROQUIA', nombre: 'Parroquia' },
      sedePadre: null,
      direccion: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
      telefono: '(2) 278 4937',
      whatsapp: null,
      correo: 'parroquia.exaltacion.obrajes@gmail.com',
      ubicacion: {
        latitud: -16.526795,
        longitud: -68.108216,
      },
      imagenPortada: {
        id: 1,
        url: '/media/seed/exterior-parroquia.webp',
        textoAlternativo: 'Vista exterior de la Parroquia Señor de la Exaltación',
        ancho: 1878,
        alto: 1057,
        variantes: [], // las imágenes del seed no tienen variantes
      },
      redesSociales: [
        {
          id: 1,
          nombre: 'Facebook',
          icono: 'facebook',
          url: 'https://www.facebook.com/profile.php?id=100064836665037',
        },
        {
          id: 2,
          nombre: 'Instagram',
          icono: 'instagram',
          url: 'https://www.instagram.com/senor_de_la_exaltacion',
        },
        {
          id: 3,
          nombre: 'YouTube',
          icono: 'youtube',
          url: 'https://www.youtube.com/@ArquidiocesisdeLaPaz/videos',
        },
      ],
      configuracion: {
        colorPrimario: '#231F20',
        colorAcento: '#E2AD11',
        textoBarraSuperior: 'Misas: lunes a viernes 7:00 y 19:00 · sábado 7:00 y 18:00 · domingo 8:00, 10:00, 12:00 y 19:00',
        textoWhatsapp: 'WhatsApp Secretaría',
        enlaceComoLlegar:
          'https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157',
        enlaceMessenger: 'https://www.facebook.com/profile.php?id=100064836665037',
        textoMessenger: 'Escríbenos por Facebook Messenger',
        descripcionPie:
          'Parroquia confiada a la Congregación de la Pasión de Jesucristo (Pasionistas). Arquidiócesis de La Paz · Vicaría Sur.',
        textoCopyright:
          '© 2026 Parroquia Señor de la Exaltación · Pasionistas Bolivia · pasionistas.org.bo',
        textoCreditos: 'Diseño y desarrollo: CodeForge · Ingeniería de Sistemas UCB',
        horariosIntroduccion:
          'Horarios regulares de la parroquia. Las celebraciones especiales se publican en el calendario.',
        horariosNotas: {
          confesionesAdoracion: 'Previo a cada misa, según disponibilidad',
          secretaria: 'Trámites, certificados e inscripciones',
        },
        horariosWhatsappSecretaria: 'Asistente 24/7',
      },
      activo: true,
    },
    {
      id: 2,
      nombre: 'Parroquia de la Resurrección',
      slug: 'resurreccion',
      tipo: { codigo: 'PARROQUIA', nombre: 'Parroquia' },
      sedePadre: null,
      direccion: 'La Paz',
      telefono: null,
      whatsapp: null,
      correo: null,
      ubicacion: null,
      imagenPortada: null,
      redesSociales: [],
      configuracion: {},
      activo: true,
    },
    {
      id: 3,
      nombre: 'Capilla San Pablo de la Cruz',
      slug: 'capilla-san-pablo-de-la-cruz',
      tipo: { codigo: 'CAPILLA', nombre: 'Capilla' },
      sedePadre: SEDE_PRINCIPAL,
      direccion: 'La Paz',
      telefono: null,
      whatsapp: null,
      correo: null,
      ubicacion: null,
      imagenPortada: null,
      redesSociales: [],
      configuracion: {},
      activo: true,
    },
  ];
}

export function crearHorariosIniciales() {
  let id = 1;
  const fila = (tipoId, diaSemana, horaInicio, horaFin = null, descripcion = null) => ({
    id: id++,
    sede: SEDE_PRINCIPAL,
    tipo: CATALOGOS.tiposHorario.find((t) => t.id === tipoId),
    diaSemana,
    horaInicio,
    horaFin,
    descripcion,
    activo: true,
  });

  const lista = [];
  for (let dia = 1; dia <= 5; dia += 1) {
    lista.push(fila(1, dia, '07:00'));
    lista.push(fila(1, dia, '19:00'));
  }
  lista.push(fila(1, 6, '07:00'));
  lista.push(fila(1, 6, '18:00', null, 'Misa vespertina dominical'));
  for (const hora of ['08:00', '10:00', '12:00', '19:00']) {
    lista.push(fila(1, 7, hora));
  }

  for (let dia = 1; dia <= 5; dia += 1) {
    lista.push(fila(2, dia, '18:00', '18:45', 'Previo a cada misa, según disponibilidad'));
  }
  lista.push(fila(2, 6, '10:00', '12:00', 'Previo a cada misa, según disponibilidad'));

  lista.push(fila(3, 4, '19:30', '20:30'));

  for (let dia = 1; dia <= 5; dia += 1) {
    lista.push(fila(4, dia, '09:00', '12:00'));
    lista.push(fila(4, dia, '15:00', '19:30'));
  }
  lista.push(fila(4, 6, '09:00', '12:00'));

  return lista;
}

export function crearServiciosIniciales() {
  return [
    {
      id: 1,
      sede: SEDE_PRINCIPAL,
      slug: 'bautismo',
      nombre: 'Bautismo',
      descripcionCorta:
        'Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.',
      icono: 'droplet',
      contenido: {
        datos: [
          { etiqueta: 'Charla pre-bautismal', valor: 'Primer sábado de cada mes' },
          { etiqueta: 'Inscripción', valor: 'Padres y padrinos se inscriben en secretaría' },
        ],
      },
      orden: 1,
      visible: true,
      preguntasFrecuentes: [
        {
          id: 1,
          pregunta: '¿Qué requisitos necesito para bautizar a mi hijo?',
          respuesta:
            'Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes.',
          orden: 0,
          activa: true,
        },
      ],
    },
    {
      id: 2,
      sede: SEDE_PRINCIPAL,
      slug: 'primera-comunion',
      nombre: 'Primera Comunión',
      descripcionCorta:
        'Catequesis de dos años para niños desde los 8 años. Inscripciones de febrero a marzo.',
      icono: 'sun',
      contenido: {
        datos: [
          { etiqueta: 'Duración', valor: 'Catequesis de dos años' },
          { etiqueta: 'Edad', valor: 'Niños desde los 8 años' },
          { etiqueta: 'Inscripciones', valor: 'De febrero a marzo' },
        ],
      },
      orden: 2,
      visible: true,
      preguntasFrecuentes: [],
    },
    {
      id: 3,
      sede: SEDE_PRINCIPAL,
      slug: 'confirmacion',
      nombre: 'Confirmación',
      descripcionCorta:
        'Preparación para jóvenes desde los 15 años y adultos que deseen completar su iniciación.',
      icono: 'flame',
      contenido: {
        datos: [
          { etiqueta: 'Jóvenes', valor: 'Desde los 15 años' },
          { etiqueta: 'Adultos', valor: 'Quienes deseen completar su iniciación cristiana' },
        ],
      },
      orden: 3,
      visible: true,
      preguntasFrecuentes: [],
    },
    {
      id: 4,
      sede: SEDE_PRINCIPAL,
      slug: 'matrimonio',
      nombre: 'Matrimonio',
      descripcionCorta:
        'Cursillo prematrimonial, presentación de documentos y proclamas con tres meses de anticipación.',
      icono: null,
      contenido: {
        datos: [
          { etiqueta: 'Preparación', valor: 'Cursillo prematrimonial' },
          { etiqueta: 'Documentos', valor: 'Presentación de documentos' },
          { etiqueta: 'Proclamas', valor: 'Con tres meses de anticipación' },
        ],
      },
      orden: 4,
      visible: true,
      preguntasFrecuentes: [],
    },
    {
      id: 5,
      sede: SEDE_PRINCIPAL,
      slug: 'catequesis-de-adultos',
      nombre: 'Catequesis de adultos',
      descripcionCorta:
        'Formación para adultos que desean recibir los sacramentos o profundizar su fe.',
      icono: 'book-open',
      contenido: {
        datos: [
          {
            etiqueta: 'Dirigida a',
            valor: 'Adultos que desean recibir los sacramentos o profundizar su fe',
          },
        ],
      },
      orden: 5,
      visible: true,
      preguntasFrecuentes: [],
    },
    {
      id: 6,
      sede: SEDE_PRINCIPAL,
      slug: 'uncion-de-los-enfermos',
      nombre: 'Unción de los enfermos',
      descripcionCorta:
        'Visita a enfermos y adultos mayores en domicilio. Coordinar por teléfono o WhatsApp.',
      icono: 'heart-pulse',
      contenido: {
        datos: [
          { etiqueta: 'Modalidad', valor: 'Visita a enfermos y adultos mayores en domicilio' },
          { etiqueta: 'Coordinación', valor: 'Por teléfono o WhatsApp' },
        ],
      },
      orden: 6,
      visible: true,
      preguntasFrecuentes: [],
    },
  ];
}

export function crearGruposIniciales() {
  return [
    {
      id: 1,
      sede: SEDE_PRINCIPAL,
      nombre: 'Monaguillos',
      descripcion: null,
      horarioReunion: 'Sábados · 10:00',
      contacto: null,
      icono: 'star',
      imagen: null,
      orden: 1,
      visible: true,
    },
    {
      id: 2,
      sede: SEDE_PRINCIPAL,
      nombre: 'Coro parroquial',
      descripcion: null,
      horarioReunion: 'Jueves · 19:00',
      contacto: null,
      icono: 'music-2',
      imagen: null,
      orden: 2,
      visible: true,
    },
    {
      id: 3,
      sede: SEDE_PRINCIPAL,
      nombre: 'Catequistas',
      descripcion: null,
      horarioReunion: 'Formación mensual',
      contacto: null,
      icono: 'book-open',
      imagen: null,
      orden: 3,
      visible: true,
    },
    {
      id: 4,
      sede: SEDE_PRINCIPAL,
      nombre: 'Pastoral Juvenil',
      descripcion: null,
      horarioReunion: 'Viernes · 18:30',
      contacto: null,
      icono: 'users',
      imagen: null,
      orden: 4,
      visible: true,
    },
    {
      id: 5,
      sede: SEDE_PRINCIPAL,
      nombre: 'Legión de María',
      descripcion: null,
      horarioReunion: 'Martes · 16:00',
      contacto: null,
      icono: 'cross',
      imagen: null,
      orden: 5,
      visible: true,
    },
    {
      id: 6,
      sede: SEDE_PRINCIPAL,
      nombre: 'Pastoral social',
      descripcion: null,
      horarioReunion: 'Cáritas parroquial',
      contacto: null,
      icono: 'heart-handshake',
      imagen: null,
      orden: 6,
      visible: true,
    },
  ];
}

export function crearVideosIniciales() {
  return videosExaltacion.map((video) => ({
    ...video,
    sede: SEDE_PRINCIPAL,
  }));
}

// Objeto imagen estándar (convenciones §7) de una imagen de la biblioteca, con sus `variantes`.
export function buscarImagenEnBiblioteca(imagenId) {
  const archivo = buscarArchivo(imagenId);
  if (!archivo || !archivo.tipoMime.startsWith('image/')) return null;
  return {
    id: archivo.id,
    url: archivo.url,
    textoAlternativo: archivo.textoAlternativo ?? null,
    ancho: archivo.ancho ?? null,
    alto: archivo.alto ?? null,
    variantes: archivo.variantes ?? [],
  };
}

