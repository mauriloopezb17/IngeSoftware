
import {
  Cross,
  Church,
  Clock3,
  BookOpen,
  Droplet,
  Sun,
  Flame,
  HeartPulse,
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
    icon: Droplet,
    text: 'Charla pre-bautismal el primer sábado de cada mes. Padres y padrinos se inscriben en secretaría.',
  },
  {
    name: 'Primera Comunión',
    icon: Sun,
    text: 'Catequesis de dos años para niños desde los 8 años. Inscripciones de febrero a marzo.',
  },
  {
    name: 'Confirmación',
    icon: Flame,
    text: 'Preparación para jóvenes desde los 15 años y adultos que deseen completar su iniciación.',
  },
  {
    name: 'Matrimonio',
    icon: null,
    text: 'Cursillo prematrimonial, presentación de documentos y proclamas con tres meses de anticipación.',
  },
  {
    name: 'Catequesis de adultos',
    icon: BookOpen,
    text: 'Formación para adultos que desean recibir los sacramentos o profundizar su fe.',
  },
  {
    name: 'Unción de los enfermos',
    icon: HeartPulse,
    text: 'Visita a enfermos y adultos mayores en domicilio. Coordinar por teléfono o WhatsApp.',
  },
];

// Actividades parroquiales
export const eventos = [
  {
    day: '31',
    month: 'OCT',
    title: 'Vigilia de Todos los Santos',
    hora: '19:00',
    lugar: 'Templo parroquial',
    tag: 'Liturgia',
  },
  {
    day: '01',
    month: 'NOV',
    title: 'Todos los Santos',
    hora: '8:00 – 10:00 – 12:00',
    lugar: 'Templo parroquial',
    tag: 'Solemnidad',
  },
  {
    day: '02',
    month: 'NOV',
    title: 'Conmemoración de los Fieles Difuntos',
    hora: '19:00',
    lugar: 'Templo parroquial',
    tag: 'Liturgia',
  },
  {
    day: '07',
    month: 'NOV',
    title: 'Charla pre-bautismal para padres y padrinos',
    hora: '9:30',
    lugar: 'Salón parroquial',
    tag: 'Catequesis',
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
  {
    categoria: 'Sacramentos',
    fecha: '18 OCT 2026',
    titulo: 'Primeras comuniones: 42 niños recibieron a Jesús',
    descripcion:
      'Una jornada de fiesta para toda la comunidad, acompañada por catequistas y familias.',
    descripcionImagen:
      'Crucifijo en el interior del templo parroquial',
    imagen: 'crucifijo',
    enlace: null,
  },
  {
    categoria: 'Comunidad',
    fecha: '11 OCT 2026',
    titulo: 'Encuentro de monaguillos de la Vicaría Sur',
    descripcion:
      'Más de 60 monaguillos compartieron una jornada de formación, juego y oración.',
    descripcionImagen:
      'Vista exterior de la Parroquia Señor de la Exaltación',
    imagen: 'exterior',
    enlace: null,
  },
  {
    categoria: 'Pastoral Familiar',
    fecha: '30 OCT 2026',
    titulo: 'Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia',
    descripcion:
      'Un espacio para reflexionar sobre la pérdida de un ser querido y encontrar acompañamiento desde la fe. Viernes 30 de octubre a las 19:30, en el Salón San Gabriel.',
    descripcionImagen:
      'Afiche del encuentro de Pastoral Familiar sobre el duelo y la pérdida de un ser querido',
    imagen: 'pastoral',
    enlace:
      'https://www.facebook.com/photo.php?fbid=1568791201958754&set=pb.100064836665037.-2207520000&type=3',
  },
];
