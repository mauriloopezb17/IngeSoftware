// Datos mock de horarios, servicios, grupos pastorales, boletines y videos según docs/api/publico.md.

export const horariosExaltacion = [
  {
    tipo: { id: 1, nombre: 'Santa Misa' },
    filas: [
      {
        dias: [1, 2, 3, 4, 5],
        etiqueta: 'Lunes a viernes',
        horarios: [
          { horaInicio: '07:00', horaFin: null, descripcion: null },
          { horaInicio: '19:00', horaFin: null, descripcion: null },
        ],
      },
      {
        dias: [6],
        etiqueta: 'Sábado',
        horarios: [
          { horaInicio: '07:00', horaFin: null, descripcion: null },
          {
            horaInicio: '18:00',
            horaFin: null,
            descripcion: 'Misa vespertina dominical',
          },
        ],
      },
      {
        dias: [7],
        etiqueta: 'Domingo',
        horarios: [
          { horaInicio: '08:00', horaFin: null, descripcion: null },
          { horaInicio: '10:00', horaFin: null, descripcion: null },
          { horaInicio: '12:00', horaFin: null, descripcion: null },
          { horaInicio: '19:00', horaFin: null, descripcion: null },
        ],
      },
    ],
  },
  {
    tipo: { id: 2, nombre: 'Confesiones' },
    filas: [
      {
        dias: [1, 2, 3, 4, 5],
        etiqueta: 'Lunes a viernes',
        horarios: [
          {
            horaInicio: '18:00',
            horaFin: '18:45',
            descripcion: 'Previo a cada misa, según disponibilidad',
          },
        ],
      },
      {
        dias: [6],
        etiqueta: 'Sábado',
        horarios: [
          {
            horaInicio: '10:00',
            horaFin: '12:00',
            descripcion: 'Previo a cada misa, según disponibilidad',
          },
        ],
      },
    ],
  },
  {
    tipo: { id: 3, nombre: 'Adoración' },
    filas: [
      {
        dias: [4],
        etiqueta: 'Jueves',
        horarios: [{ horaInicio: '19:30', horaFin: '20:30', descripcion: null }],
      },
    ],
  },
  {
    tipo: { id: 4, nombre: 'Secretaría' },
    filas: [
      {
        dias: [1, 2, 3, 4, 5],
        etiqueta: 'Lunes a viernes',
        horarios: [
          { horaInicio: '09:00', horaFin: '12:00', descripcion: null },
          { horaInicio: '15:00', horaFin: '19:30', descripcion: null },
        ],
      },
      {
        dias: [6],
        etiqueta: 'Sábado',
        horarios: [{ horaInicio: '09:00', horaFin: '12:00', descripcion: null }],
      },
    ],
  },
];

export const serviciosExaltacion = [
  {
    id: 1,
    slug: 'bautismo',
    nombre: 'Bautismo',
    descripcionCorta:
      'Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.',
    icono: 'droplet',
    orden: 1,
    contenido: {
      datos: [
        { etiqueta: 'Charla pre-bautismal', valor: 'Primer sábado de cada mes' },
        { etiqueta: 'Inscripción', valor: 'Padres y padrinos se inscriben en secretaría' },
      ],
    },
    preguntasFrecuentes: [
      {
        id: 1,
        pregunta: '¿Qué requisitos necesito para bautizar a mi hijo?',
        respuesta:
          'Certificado de nacimiento, CI de padres y padrinos, y asistir a la charla pre-bautismal del primer sábado de cada mes.',
      },
    ],
  },
  {
    id: 2,
    slug: 'primera-comunion',
    nombre: 'Primera Comunión',
    descripcionCorta:
      'Catequesis de dos años para niños desde los 8 años. Inscripciones de febrero a marzo.',
    icono: 'sun',
    orden: 2,
    contenido: {
      datos: [
        { etiqueta: 'Duración', valor: 'Catequesis de dos años' },
        { etiqueta: 'Edad', valor: 'Niños desde los 8 años' },
        { etiqueta: 'Inscripciones', valor: 'De febrero a marzo' },
      ],
    },
    preguntasFrecuentes: [],
  },
  {
    id: 3,
    slug: 'confirmacion',
    nombre: 'Confirmación',
    descripcionCorta:
      'Preparación para jóvenes desde los 15 años y adultos que deseen completar su iniciación.',
    icono: 'flame',
    orden: 3,
    contenido: {
      datos: [
        { etiqueta: 'Jóvenes', valor: 'Desde los 15 años' },
        { etiqueta: 'Adultos', valor: 'Quienes deseen completar su iniciación cristiana' },
      ],
    },
    preguntasFrecuentes: [],
  },
  {
    id: 4,
    slug: 'matrimonio',
    nombre: 'Matrimonio',
    descripcionCorta:
      'Cursillo prematrimonial, presentación de documentos y proclamas con tres meses de anticipación.',
    icono: null,
    orden: 4,
    contenido: {
      datos: [
        { etiqueta: 'Preparación', valor: 'Cursillo prematrimonial' },
        { etiqueta: 'Documentos', valor: 'Presentación de documentos' },
        { etiqueta: 'Proclamas', valor: 'Con tres meses de anticipación' },
      ],
    },
    preguntasFrecuentes: [],
  },
  {
    id: 5,
    slug: 'catequesis-de-adultos',
    nombre: 'Catequesis de adultos',
    descripcionCorta:
      'Formación para adultos que desean recibir los sacramentos o profundizar su fe.',
    icono: 'book-open',
    orden: 5,
    contenido: {
      datos: [
        {
          etiqueta: 'Dirigida a',
          valor: 'Adultos que desean recibir los sacramentos o profundizar su fe',
        },
      ],
    },
    preguntasFrecuentes: [],
  },
  {
    id: 6,
    slug: 'uncion-de-los-enfermos',
    nombre: 'Unción de los enfermos',
    descripcionCorta:
      'Visita a enfermos y adultos mayores en domicilio. Coordinar por teléfono o WhatsApp.',
    icono: 'heart-pulse',
    orden: 6,
    contenido: {
      datos: [
        { etiqueta: 'Modalidad', valor: 'Visita a enfermos y adultos mayores en domicilio' },
        { etiqueta: 'Coordinación', valor: 'Por teléfono o WhatsApp' },
      ],
    },
    preguntasFrecuentes: [],
  },
];

export const gruposPastoralesExaltacion = [
  {
    id: 1,
    nombre: 'Monaguillos',
    descripcion: null,
    horarioReunion: 'Sábados · 10:00',
    contacto: null,
    icono: 'star',
    imagen: null,
    orden: 1,
  },
  {
    id: 2,
    nombre: 'Coro parroquial',
    descripcion: null,
    horarioReunion: 'Jueves · 19:00',
    contacto: null,
    icono: 'music-2',
    imagen: null,
    orden: 2,
  },
  {
    id: 3,
    nombre: 'Catequistas',
    descripcion: null,
    horarioReunion: 'Formación mensual',
    contacto: null,
    icono: 'book-open',
    imagen: null,
    orden: 3,
  },
  {
    id: 4,
    nombre: 'Pastoral Juvenil',
    descripcion: null,
    horarioReunion: 'Viernes · 18:30',
    contacto: null,
    icono: 'users',
    imagen: null,
    orden: 4,
  },
  {
    id: 5,
    nombre: 'Legión de María',
    descripcion: null,
    horarioReunion: 'Martes · 16:00',
    contacto: null,
    icono: 'cross',
    imagen: null,
    orden: 5,
  },
  {
    id: 6,
    nombre: 'Pastoral social',
    descripcion: null,
    horarioReunion: 'Cáritas parroquial',
    contacto: null,
    icono: 'heart-handshake',
    imagen: null,
    orden: 6,
  },
];

export const boletinesExaltacion = [
  {
    id: 1,
    titulo: 'Edición de octubre 2026',
    periodo: '2026-10-01',
    fechaPublicacion: '2026-10-03T10:00:00-04:00',
    archivo: {
      id: 7,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/10/8f3c2a1d-5b7e-4c90-a1f4-6d2e9b0c7a35.pdf',
      nombreOriginal: 'Boletín octubre 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 2516582,
    },
  },
  {
    id: 2,
    titulo: 'Edición de septiembre 2026',
    periodo: '2026-09-01',
    fechaPublicacion: '2026-09-04T10:00:00-04:00',
    archivo: {
      id: 8,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/09/boletin-septiembre-2026.pdf',
      nombreOriginal: 'Boletín septiembre 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 2150400,
    },
  },
  {
    id: 3,
    titulo: 'Edición de agosto 2026',
    periodo: '2026-08-01',
    fechaPublicacion: '2026-08-02T10:00:00-04:00',
    archivo: {
      id: 9,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/08/boletin-agosto-2026.pdf',
      nombreOriginal: 'Boletín agosto 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 1887436,
    },
  },
  {
    id: 4,
    titulo: 'Edición de julio 2026',
    periodo: '2026-07-01',
    fechaPublicacion: '2026-07-05T10:00:00-04:00',
    archivo: {
      id: 10,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/07/boletin-julio-2026.pdf',
      nombreOriginal: 'Boletín julio 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 1730150,
    },
  },
  {
    id: 5,
    titulo: 'Edición de junio 2026',
    periodo: '2026-06-01',
    fechaPublicacion: '2026-06-03T10:00:00-04:00',
    archivo: {
      id: 11,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2026/06/boletin-junio-2026.pdf',
      nombreOriginal: 'Boletín junio 2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 1992294,
    },
  },
  {
    id: 6,
    titulo: 'Edición de diciembre 2025',
    periodo: '2025-12-01',
    fechaPublicacion: '2025-12-02T10:00:00-04:00',
    archivo: {
      id: 12,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2025/12/boletin-diciembre-2025.pdf',
      nombreOriginal: 'Boletín diciembre 2025.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 2831155,
    },
  },
  {
    id: 7,
    titulo: 'Edición de noviembre 2025',
    periodo: '2025-11-01',
    fechaPublicacion: '2025-11-03T10:00:00-04:00',
    archivo: {
      id: 13,
      url: 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion/2025/11/boletin-noviembre-2025.pdf',
      nombreOriginal: 'Boletín noviembre 2025.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 1625292,
    },
  },
];

// El seed no incluye videos de YouTube; VideoInstitucional usa el fallback de hero_video.
export const videosExaltacion = [];
