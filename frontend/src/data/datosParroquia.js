
import {
  Cross,
  Church,
  Clock3,
  BookOpen,
  Heart,
  CircleDot,
  Users,
  HeartHandshake,
} from 'lucide-react';

// Horarios de atención y celebraciones
export const horarios = [
  {
    title: 'Santa Misa',
    icon: Cross,
    rows: [
      ['Lunes a viernes', '7:00 · 19:00'],
      ['Sábado', '7:00 · 18:00*'],
      ['Domingo', '8:00 · 10:00 · 12:00 · 19:00'],
    ],
    note: '* Misa vespertina dominical',
  },
  {
    title: 'Confesiones y Adoración',
    icon: Church,
    rows: [
      ['Lunes a viernes', '18:00 – 18:45'],
      ['Sábado', '10:00 – 12:00'],
      ['Jueves · Adoración', '19:30 – 20:30'],
    ],
    note: 'Previo a cada misa, según disponibilidad',
  },
  {
    title: 'Secretaría parroquial',
    icon: Clock3,
    rows: [
      ['Lunes a viernes', '9:00 – 12:00 · 15:00 – 19:30'],
      ['Sábado', '9:00 – 12:00'],
      ['WhatsApp', 'Asistente 24/7'],
    ],
    note: 'Trámites, certificados e inscripciones',
  },
];

// Servicios y sacramentos
export const sacramentos = [
  {
    name: 'Bautismo',
    icon: Cross,
    text: 'El comienzo del camino de fe y la bienvenida a la comunidad cristiana.',
  },
  {
    name: 'Primera Comunión',
    icon: BookOpen,
    text: 'Preparación para recibir por primera vez el cuerpo de Cristo.',
  },
  {
    name: 'Confirmación',
    icon: Heart,
    text: 'Fortalecemos nuestra fe y compromiso con el Espíritu Santo.',
  },
  {
    name: 'Matrimonio',
    icon: CircleDot,
    text: 'Acompañamos a las parejas en su camino hacia el sacramento.',
  },
  {
    name: 'Catequesis de adultos',
    icon: Users,
    text: 'Un espacio de formación y encuentro para crecer en la fe.',
  },
  {
    name: 'Unción de los enfermos',
    icon: HeartHandshake,
    text: 'Oración, consuelo y acompañamiento en momentos de dificultad.',
  },
];

// Actividades parroquiales
export const eventos = [
  {
    day: '31',
    month: 'OCT',
    title: 'Encuentro de jóvenes',
    detail: 'Salón parroquial · 16:00',
    tag: 'Comunidad',
  },
  {
    day: '01',
    month: 'NOV',
    title: 'Solemnidad de Todos los Santos',
    detail: 'Templo parroquial · Horarios de misa',
    tag: 'Celebración',
  },
  {
    day: '02',
    month: 'NOV',
    title: 'Conmemoración de los Fieles Difuntos',
    detail: 'Templo parroquial · Celebraciones especiales',
    tag: 'Liturgia',
  },
  {
    day: '07',
    month: 'NOV',
    title: 'Jornada de pastoral parroquial',
    detail: 'Ambientes parroquiales · 09:00',
    tag: 'Pastoral',
  },
];

// Avisos para la comunidad
export const avisos = [
  [
    '24 OCT',
    'Inscripciones abiertas para la catequesis de Confirmación 2027.',
  ],
  [
    '22 OCT',
    'El 2 de noviembre la secretaría atenderá solo por la mañana.',
  ],
  [
    '20 OCT',
    'Recibimos donaciones de víveres para la Pastoral Social hasta fin de mes.',
  ],
];

// Proclamas matrimoniales
export const proclamas = [
  [
    'Juan Carlos M. Q. & María Fernanda R. V.',
    'Boda: sábado 14 de noviembre · 11:00',
    '3.ª proclama',
  ],
  [
    'Diego A. Choque L. & Camila S. Paredes',
    'Boda: sábado 21 de noviembre · 16:00',
    '2.ª proclama',
  ],
  [
    'Luis F. Gutiérrez & Andrea Mamani C.',
    'Boda: sábado 5 de diciembre · 12:00',
    '1.ª proclama',
  ],
];

// Noticias de la parroquia
export const noticias = [
  [
    '19 OCT 2026',
    'Nuestra comunidad celebra un nuevo encuentro parroquial',
  ],
  [
    '18 OCT 2026',
    'La pastoral social continúa acompañando a las familias',
  ],
  [
    '11 OCT 2026',
    'Jóvenes comparten una jornada de fe y comunidad',
  ],
];
