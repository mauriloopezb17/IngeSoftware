// Datos mock de sedes y páginas editables según docs/api/publico.md y docs/api/contenido.md.

export const sedesLista = [
  {
    id: 1,
    nombre: 'Parroquia Señor de la Exaltación',
    slug: 'senor-de-la-exaltacion',
    tipo: { codigo: 'PARROQUIA', nombre: 'Parroquia' },
    sedePadre: null,
    direccion: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
    imagenPortada: {
      id: 1,
      url: '/media/seed/exterior-parroquia.webp',
      textoAlternativo: 'Vista exterior de la Parroquia Señor de la Exaltación',
      ancho: 1878,
      alto: 1057,
      variantes: [],
    },
    enlaceComoLlegar:
      'https://www.google.com/maps/dir/?api=1&destination=-16.5267952%2C-68.1082157',
  },
  {
    id: 2,
    nombre: 'Parroquia de la Resurrección',
    slug: 'resurreccion',
    tipo: { codigo: 'PARROQUIA', nombre: 'Parroquia' },
    sedePadre: null,
    direccion: 'La Paz',
    imagenPortada: null,
    enlaceComoLlegar: null,
  },
  {
    id: 3,
    nombre: 'Capilla San Pablo de la Cruz',
    slug: 'capilla-san-pablo-de-la-cruz',
    tipo: { codigo: 'CAPILLA', nombre: 'Capilla' },
    sedePadre: {
      id: 1,
      nombre: 'Parroquia Señor de la Exaltación',
      slug: 'senor-de-la-exaltacion',
    },
    direccion: 'La Paz',
    imagenPortada: null,
    enlaceComoLlegar: null,
  },
];

export const sedesDetalle = {
  'senor-de-la-exaltacion': {
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
      variantes: [],
    },
    redesSociales: [
      {
        nombre: 'Facebook',
        icono: 'facebook',
        url: 'https://www.facebook.com/profile.php?id=100064836665037',
      },
      {
        nombre: 'Instagram',
        icono: 'instagram',
        url: 'https://www.instagram.com/senor_de_la_exaltacion',
      },
      {
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
  },
  resurreccion: {
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
  },
  'capilla-san-pablo-de-la-cruz': {
    id: 3,
    nombre: 'Capilla San Pablo de la Cruz',
    slug: 'capilla-san-pablo-de-la-cruz',
    tipo: { codigo: 'CAPILLA', nombre: 'Capilla' },
    sedePadre: {
      id: 1,
      nombre: 'Parroquia Señor de la Exaltación',
      slug: 'senor-de-la-exaltacion',
    },
    direccion: 'La Paz',
    telefono: null,
    whatsapp: null,
    correo: null,
    ubicacion: null,
    imagenPortada: null,
    redesSociales: [],
    configuracion: {},
  },
};

export const menuPaginasExaltacion = [
  {
    id: 2,
    slug: 'nosotros',
    titulo: 'Quiénes somos',
    paginaPadreId: null,
    ordenMenu: 1,
  },
];

export const paginasExaltacion = {
  inicio: {
    id: 1,
    slug: 'inicio',
    titulo: 'Inicio',
    descripcionSeo: null,
    paginaPadre: null,
    fechaActualizacion: null,
    bloques: [
      {
        id: 1,
        tipo: 'hero_video',
        orden: 1,
        contenido: {
          etiqueta: 'Parroquia Pasionista · Obrajes, La Paz',
          titulo: 'Señor de la Exaltación',
          subtitulo:
            'Una comunidad que camina junto a Cristo crucificado y resucitado. Te esperamos en casa, con las puertas siempre abiertas.',
          url_video: '/media/seed/portada-final.mp4',
          url_poster: '/media/seed/exterior-parroquia.webp',
          texto_video: 'Video institucional',
          detalle_video: 'Recorrido aéreo · 0:30',
          botones: [
            { texto: 'Ver horarios de misa', enlace: '#horarios' },
            { texto: 'Conócenos', enlace: '#nosotros' },
          ],
        },
      },
      {
        id: 2,
        tipo: 'tarjetas',
        orden: 2,
        contenido: {
          items: [
            {
              titulo: 'Horarios de Misa',
              subtitulo: 'Toda la semana',
              icono: 'clock-3',
              enlace: '#horarios',
            },
            {
              titulo: 'Sacramentos',
              subtitulo: 'Requisitos y fechas',
              icono: 'droplet',
              enlace: '#sacramentos',
            },
            {
              titulo: 'Calendario',
              subtitulo: 'Próximas actividades',
              icono: 'calendar-days',
              enlace: '#agenda',
            },
            {
              titulo: 'Proclamas',
              subtitulo: 'Vigentes esta semana',
              icono: 'scroll-text',
              enlace: '#proclamas',
            },
          ],
        },
      },
    ],
  },
  nosotros: {
    id: 2,
    slug: 'nosotros',
    titulo: 'Quiénes somos',
    descripcionSeo: null,
    paginaPadre: null,
    fechaActualizacion: null,
    bloques: [
      {
        id: 3,
        tipo: 'texto_imagen',
        orden: 1,
        contenido: {
          etiqueta: 'Quiénes somos',
          titulo: 'Una casa de oración en el corazón de Obrajes',
          texto:
            'Somos una comunidad parroquial confiada a los Padres Pasionistas, que desde la memoria de la Pasión de Cristo acompaña a las familias de Obrajes en la fe, los sacramentos y el servicio a los más necesitados.',
          url_imagen: '/media/seed/crucifijo.webp',
          posicion_imagen: 'izquierda',
          tarjeta: {
            etiqueta: 'Congregación de la Pasión',
            titulo: 'Pasionistas · C.P.',
            descripcion: 'Fundada por San Pablo de la Cruz',
          },
        },
      },
      {
        id: 4,
        tipo: 'cita',
        orden: 2,
        contenido: {
          texto: 'Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.',
          autor: 'Lema de la Congregación Pasionista',
        },
      },
      {
        id: 5,
        tipo: 'tarjetas',
        orden: 3,
        contenido: {
          items: [
            {
              titulo: 'P. Gregorio, C.P.',
              subtitulo: 'Párroco',
              url_imagen: '/media/seed/padre_gregorio.jpg',
            },
          ],
        },
      },
    ],
  },
};
