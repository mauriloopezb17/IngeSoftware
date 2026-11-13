// Datos de la biblioteca multimedia simulada (docs/api/admin.md §2).
// Los archivos 1 a 6 son los del seed de la base (database/seed): mismas URLs relativas
// `/media/seed/<archivo>`, tamaños, dimensiones y textos alternativos. El 8 es el ejemplo literal
// del contrato. El resto son datos de muestra para probar filtros y paginación.
import { SEDE_PRINCIPAL } from './usuarios.js';

const CDN = 'https://cdn.pasionistas.org.bo/sedes/senor-de-la-exaltacion';

const ADMINISTRADOR = { id: 1, nombreCompleto: 'Administrador (desarrollo)' };
const PARROCO = { id: 2, nombreCompleto: 'Párroco (desarrollo)' };
const SECRETARIA = { id: 3, nombreCompleto: 'Secretaría (desarrollo)' };
const MARKETING = { id: 4, nombreCompleto: 'Marketing (desarrollo)' };

// `variantes` (admin.md §2): [] en lo que no es imagen, en las imágenes del seed y en las de menos de 480 px.
const archivo = (datos) => ({ sede: SEDE_PRINCIPAL, textoAlternativo: null, enUso: false, variantes: [], ...datos });

// Variantes de una imagen del CDN: solo los anchos menores que el de la imagen (480, 960 y 1600).
const variantesDe = (url, ancho) =>
  [480, 960, 1600].filter((v) => v < ancho).map((v) => ({ ancho: v, url: url.replace(/\.\w+$/, `-${v}w.webp`) }));

export function crearArchivosIniciales() {
  return [
    archivo({
      id: 1,
      url: '/media/seed/exterior-parroquia.webp',
      nombreOriginal: 'exterior-parroquia.webp',
      tipoMime: 'image/webp',
      tamanoBytes: 243828,
      ancho: 1878,
      alto: 1057,
      textoAlternativo: 'Vista exterior de la Parroquia Señor de la Exaltación',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:00:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 2,
      url: '/media/seed/crucifijo.webp',
      nombreOriginal: 'crucifijo.webp',
      tipoMime: 'image/webp',
      tamanoBytes: 110004,
      ancho: 1888,
      alto: 1059,
      textoAlternativo: 'Crucifijo en el interior del templo parroquial',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:01:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 3,
      url: '/media/seed/altar.webp',
      nombreOriginal: 'altar.webp',
      tipoMime: 'image/webp',
      tamanoBytes: 176770,
      ancho: 1879,
      alto: 1057,
      textoAlternativo:
        'Altar del templo parroquial adornado con flores rojas y blancas, con un tríptico de icono al lado derecho',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:02:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 4,
      url: '/media/seed/padre_gregorio.jpg',
      nombreOriginal: 'padre_gregorio.jpg',
      tipoMime: 'image/jpeg',
      tamanoBytes: 194874,
      ancho: 1366,
      alto: 2048,
      textoAlternativo: 'P. Gregorio, C.P., párroco',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:03:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 5,
      url: '/media/seed/pastoral-familiar.jpg',
      nombreOriginal: 'pastoral-familiar.jpg',
      tipoMime: 'image/jpeg',
      tamanoBytes: 185283,
      ancho: 1137,
      alto: 1383,
      textoAlternativo: 'Afiche del encuentro de Pastoral Familiar sobre el duelo y la pérdida de un ser querido',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:04:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 6,
      url: '/media/seed/portada-final.mp4',
      nombreOriginal: 'portada-final.mp4',
      tipoMime: 'video/mp4',
      tamanoBytes: 58916372,
      ancho: 1920,
      alto: 1080,
      textoAlternativo: 'Video institucional: recorrido por el templo de la Parroquia Señor de la Exaltación',
      subidoPor: ADMINISTRADOR,
      fechaSubida: '2026-11-01T09:05:00-04:00',
      enUso: true,
    }),
    archivo({
      id: 7,
      url: `${CDN}/2026/10/6c1f0e52-3b8a-4d17-9e04-1a7b2c5d8f90.pdf`,
      nombreOriginal: 'boletin-octubre-2026.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 2516582,
      ancho: null,
      alto: null,
      subidoPor: SECRETARIA,
      fechaSubida: '2026-10-30T16:20:10-04:00',
      enUso: true,
    }),
    // Ejemplo literal del contrato (admin.md §2, «Objeto archivo multimedia»).
    archivo({
      id: 8,
      url: `${CDN}/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp`,
      variantes: variantesDe(`${CDN}/2026/11/4b1e9c2a-7d3f-4e8a-9c61-2f0d8a5b3e17.webp`, 1600),
      nombreOriginal: 'primeras comuniones 2026.webp',
      tipoMime: 'image/webp',
      tamanoBytes: 412870,
      ancho: 1600,
      alto: 1067,
      textoAlternativo: 'Niños de primera comunión frente al altar',
      subidoPor: MARKETING,
      fechaSubida: '2026-11-12T09:12:44-04:00',
      enUso: true,
    }),
    archivo({
      id: 9,
      url: `${CDN}/2026/11/0d7a3b19-52c4-48e6-b1f3-9a6e7c2d4081.jpg`,
      nombreOriginal: 'procesion-semana-santa.jpg',
      tipoMime: 'image/jpeg',
      tamanoBytes: 689312,
      ancho: 2048,
      alto: 1365,
      textoAlternativo: 'Procesión de Semana Santa por las calles de Obrajes',
      subidoPor: MARKETING,
      fechaSubida: '2026-11-10T11:05:31-04:00',
    }),
    archivo({
      id: 10,
      url: `${CDN}/2026/11/e3a91c64-0b2d-4f75-8a1e-5d9c3b7f2a06.png`,
      nombreOriginal: 'catequesis-confirmacion.png',
      tipoMime: 'image/png',
      tamanoBytes: 1203944,
      ancho: 1280,
      alto: 853,
      subidoPor: SECRETARIA,
      fechaSubida: '2026-11-08T15:42:09-04:00',
    }),
    archivo({
      id: 11,
      url: `${CDN}/2026/11/9f5b2d80-7c1e-4a39-b6d4-2e8a0c1f7b53.webp`,
      nombreOriginal: 'misa-dominical.webp',
      tipoMime: 'image/webp',
      tamanoBytes: 318420,
      ancho: 1600,
      alto: 900,
      textoAlternativo: 'Fieles durante la misa dominical',
      subidoPor: PARROCO,
      fechaSubida: '2026-11-05T12:00:00-04:00',
    }),
    archivo({
      id: 12,
      url: `${CDN}/2026/10/b8c4e170-3a95-4d2f-8e6b-7f1d0a9c5e42.jpg`,
      nombreOriginal: 'retiro-juvenil.jpg',
      tipoMime: 'image/jpeg',
      tamanoBytes: 905116,
      ancho: 1800,
      alto: 1200,
      subidoPor: MARKETING,
      fechaSubida: '2026-10-27T18:30:00-04:00',
    }),
    archivo({
      id: 13,
      url: `${CDN}/2026/10/2a6d8f03-9e41-4b7c-a5d2-1c3e9b0f6d78.mp4`,
      nombreOriginal: 'saludo-del-parroco.mp4',
      tipoMime: 'video/mp4',
      tamanoBytes: 154239871,
      ancho: 1920,
      alto: 1080,
      textoAlternativo: 'El párroco saluda a la comunidad',
      subidoPor: MARKETING,
      fechaSubida: '2026-10-20T10:15:00-04:00',
    }),
    archivo({
      id: 14,
      url: `${CDN}/2026/10/c71e5a92-4d08-4f36-9b2a-8e0d1f3c6a57.pdf`,
      nombreOriginal: 'estatutos-pastoral-juvenil.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 845221,
      ancho: null,
      alto: null,
      subidoPor: SECRETARIA,
      fechaSubida: '2026-10-12T09:00:00-04:00',
    }),
  ];
}

// Motivo por el que un archivo en uso no se puede eliminar (ejemplo del contrato para el id 8).
export const USO_DE_ARCHIVOS = {
  1: 'Usado como portada de la sede «Parroquia Señor de la Exaltación».',
  2: 'Usado en la página «Inicio».',
  3: 'Usado en la página «Inicio».',
  4: 'Usado en la página «Quiénes somos».',
  5: 'Usado como portada de la publicación «Encuentro de Pastoral Familiar».',
  6: 'Usado en la página «Inicio».',
  7: 'Usado en el boletín «Octubre 2026».',
  8: 'Usado como portada de la publicación «Primeras comuniones: 42 niños recibieron a Jesús».',
};
