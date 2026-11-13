// Publicaciones de muestra del panel (docs/api/admin.md §3 y estados-publicacion.md §7).
// Cubren todos los estados y situaciones (borrador, rechazada, en revisión, programada, vigente,
// expirada y archivada) para probar el listado, la bandeja de revisión y las acciones por rol.
// Las fechas son relativas a «ahora» para que la programada y la expirada lo sigan siendo.
import { fechaBolivia, SEDE_PRINCIPAL } from './usuarios.js';

export const CATEGORIAS = [
  { id: 1, nombre: 'Sacramentos', slug: 'sacramentos' },
  { id: 2, nombre: 'Comunidad', slug: 'comunidad' },
  { id: 3, nombre: 'Pasionistas', slug: 'pasionistas' },
  { id: 4, nombre: 'Pastoral Familiar', slug: 'pastoral-familiar' },
];

export const TIPOS = {
  NOTICIA: { codigo: 'NOTICIA', nombre: 'Noticia' },
  AVISO: { codigo: 'AVISO', nombre: 'Aviso' },
  NOTA_DE_PRENSA: { codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' },
};

export const ESTADOS = {
  BORRADOR: { codigo: 'BORRADOR', nombre: 'Borrador' },
  EN_REVISION: { codigo: 'EN_REVISION', nombre: 'En revisión' },
  PUBLICADO: { codigo: 'PUBLICADO', nombre: 'Publicado' },
  ARCHIVADO: { codigo: 'ARCHIVADO', nombre: 'Archivado' },
};

const ADMINISTRADOR = { id: 1, nombreCompleto: 'Administrador (desarrollo)' };
const PARROCO = { id: 2, nombreCompleto: 'Párroco (desarrollo)' };
const SECRETARIA = { id: 3, nombreCompleto: 'Secretaría (desarrollo)' };
const MARKETING = { id: 4, nombreCompleto: 'Marketing (desarrollo)' };

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const hace = (ms) => fechaBolivia(new Date(Date.now() - ms));
const en = (ms) => fechaBolivia(new Date(Date.now() + ms));

const PROPS_TEXTO = { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' };

export function parrafo(id, texto) {
  return {
    id,
    type: 'paragraph',
    props: { ...PROPS_TEXTO },
    content: [{ type: 'text', text: texto, styles: {} }],
    children: [],
  };
}

const documento = (...bloques) => ({ formato: 'blocknote', version: 1, bloques });

const base = (datos) => ({
  sede: SEDE_PRINCIPAL,
  slug: null,
  resumen: null,
  categoria: null,
  imagenPortadaId: null,
  urlExterna: null,
  destacada: false,
  fechaPublicacion: null,
  fechaExpiracion: null,
  revision: null,
  ...datos,
});

export function crearPublicacionesIniciales() {
  return [
    base({
      id: 1,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.PUBLICADO,
      titulo: 'Primeras comuniones: 42 niños recibieron a Jesús',
      slug: 'primeras-comuniones-42-ninos-recibieron-a-jesus',
      resumen: 'Una celebración llena de alegría para las familias de la comunidad.',
      categoria: CATEGORIAS[0],
      imagenPortadaId: 8,
      destacada: true,
      contenido: documento(parrafo('n1-p1', 'Este domingo 42 niños recibieron por primera vez la Eucaristía.')),
      autor: PARROCO,
      fechaCreacion: hace(6 * DIA),
      fechaPublicacion: hace(5 * DIA),
    }),
    base({
      id: 2,
      tipo: TIPOS.AVISO,
      estado: ESTADOS.PUBLICADO,
      titulo: 'El próximo lunes la secretaría atenderá solo por la mañana.',
      slug: 'secretaria-atencion-lunes',
      contenido: documento(parrafo('a2-p1', 'El próximo lunes la secretaría atenderá solo por la mañana.')),
      autor: SECRETARIA,
      fechaCreacion: hace(3 * DIA),
      fechaPublicacion: hace(3 * DIA),
    }),
    base({
      id: 3,
      tipo: TIPOS.AVISO,
      estado: ESTADOS.PUBLICADO,
      titulo: 'Inscripciones abiertas para la catequesis de Confirmación 2027.',
      slug: 'inscripciones-confirmacion-2027',
      contenido: documento(parrafo('a3-p1', 'Inscripciones abiertas para la catequesis de Confirmación 2027.')),
      autor: SECRETARIA,
      fechaCreacion: hace(1 * DIA),
      fechaPublicacion: hace(1 * DIA),
    }),
    base({
      id: 4,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.BORRADOR,
      titulo: 'Retiro de Adviento: inscripciones abiertas',
      resumen: 'Un fin de semana de oración y silencio para preparar la Navidad.',
      categoria: CATEGORIAS[1],
      contenido: documento(parrafo('n4-p1', 'Abrimos las inscripciones para el retiro de Adviento.')),
      autor: MARKETING,
      fechaCreacion: hace(2 * DIA),
    }),
    base({
      id: 5,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.BORRADOR,
      titulo: 'Encuentro de monaguillos de la Vicaría Sur',
      categoria: CATEGORIAS[2],
      contenido: documento(parrafo('n5-p1', 'Los monaguillos de la vicaría se reunieron este sábado.')),
      autor: MARKETING,
      fechaCreacion: hace(4 * DIA),
      revision: {
        revisadoPor: PARROCO,
        fecha: hace(1 * DIA),
        observacion: 'Agregar el nombre de la parroquia anfitriona y una foto del encuentro.',
      },
    }),
    base({
      id: 6,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.EN_REVISION,
      titulo: 'Jornada de oración por las vocaciones',
      resumen: 'Toda la comunidad está invitada a rezar por las vocaciones sacerdotales.',
      categoria: CATEGORIAS[2],
      contenido: documento(parrafo('n6-p1', 'El viernes por la tarde tendremos una hora santa por las vocaciones.')),
      autor: MARKETING,
      fechaCreacion: hace(1 * DIA),
    }),
    base({
      id: 7,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.EN_REVISION,
      titulo: 'Solemnidad de Cristo Rey: invitación a la procesión',
      slug: null,
      resumen:
        'El domingo 22 de noviembre celebramos a Cristo Rey con misa solemne y procesión con el Santísimo.',
      categoria: CATEGORIAS[1],
      imagenPortadaId: 3,
      destacada: true,
      contenido: documento(
        parrafo(
          'c1',
          'Invitamos a toda la comunidad a la misa solemne de las 10:00 y a la procesión con el Santísimo alrededor de la plaza.',
        ),
      ),
      autor: MARKETING,
      fechaCreacion: hace(5 * HORA),
      fechaPublicacion: en(2 * DIA),
      fechaExpiracion: en(10 * DIA),
    }),
    base({
      id: 8,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.PUBLICADO,
      titulo: 'Festividad del Señor de la Exaltación: programa completo',
      slug: 'festividad-del-senor-de-la-exaltacion-programa-completo',
      categoria: CATEGORIAS[1],
      imagenPortadaId: 1,
      contenido: documento(parrafo('n8-p1', 'Conoce las misas, la procesión y las actividades de la festividad.')),
      autor: PARROCO,
      fechaCreacion: hace(2 * DIA),
      fechaPublicacion: en(3 * DIA), // programada
      revision: { revisadoPor: PARROCO, fecha: hace(1 * DIA), observacion: null },
    }),
    base({
      id: 9,
      tipo: TIPOS.NOTA_DE_PRENSA,
      estado: ESTADOS.PUBLICADO,
      titulo: 'Comunicado sobre el horario de las misas durante la obra del atrio',
      slug: 'comunicado-horario-misas-obra-del-atrio',
      categoria: CATEGORIAS[1],
      contenido: documento(parrafo('p9-p1', 'Durante la obra del atrio las misas se celebrarán en el salón parroquial.')),
      autor: ADMINISTRADOR,
      fechaCreacion: hace(25 * DIA),
      fechaPublicacion: hace(20 * DIA),
      fechaExpiracion: hace(2 * DIA), // expirada
    }),
    base({
      id: 10,
      tipo: TIPOS.NOTICIA,
      estado: ESTADOS.ARCHIVADO,
      titulo: 'Misa de acción de gracias por los 50 años de la parroquia',
      slug: 'misa-de-accion-de-gracias-50-anos',
      categoria: CATEGORIAS[2],
      contenido: documento(parrafo('n10-p1', 'La comunidad celebró medio siglo de historia.')),
      autor: PARROCO,
      fechaCreacion: hace(60 * DIA),
      fechaPublicacion: hace(55 * DIA),
    }),
    base({
      id: 11,
      tipo: TIPOS.NOTA_DE_PRENSA,
      estado: ESTADOS.BORRADOR,
      titulo: 'Nota de prensa: campaña de víveres de la Pastoral Social',
      categoria: CATEGORIAS[1],
      contenido: documento(parrafo('p11-p1', 'La Pastoral Social inicia su campaña anual de víveres.')),
      autor: PARROCO,
      fechaCreacion: hace(6 * HORA),
    }),
  ];
}

export const SIGUIENTE_ID_INICIAL = 12;
