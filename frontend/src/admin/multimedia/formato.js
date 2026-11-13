// Formatos de presentación de la biblioteca multimedia.
const UNIDADES = ['B', 'KB', 'MB', 'GB'];

// 412870 -> "403,2 KB". Base 1024, igual que los límites del contrato (30 MB, 2 GB...).
export function formatearTamano(bytes) {
  let valor = bytes;
  let unidad = 0;
  while (valor >= 1024 && unidad < UNIDADES.length - 1) {
    valor /= 1024;
    unidad++;
  }
  const texto = valor.toLocaleString('es', { maximumFractionDigits: unidad === 0 ? 0 : 1 });
  return `${texto} ${UNIDADES[unidad]}`;
}

// La API responde con la hora de Bolivia (-04:00); se muestra siempre en esa zona.
const formatoFecha = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/La_Paz',
});

export const formatearFecha = (iso) => formatoFecha.format(new Date(iso));

export const contarImagenes = (n) => `${n} ${n === 1 ? 'imagen' : 'imágenes'}`;

export const contarArchivos =(n) => `${n} ${n === 1 ? 'archivo' : 'archivos'}`;
