// Archivos del editor: imágenes y videos que se suben a la biblioteca multimedia (POST /admin/multimedia)
// o se eligen de ella. contenido.md: la `url` de un bloque `image` o `video` debe ser de la biblioteca de
// la misma sede, por eso el panel de archivos del editor no ofrece pegar enlaces externos.
import { subirArchivo } from '../../multimedia/api.js';
import { claseDeTipo } from '../../multimedia/tipos.js';
import { tipoDelArchivo, validarArchivoCliente } from '../../multimedia/validacion.js';

// Propiedades de un bloque `image`/`video` a partir de un archivo de la biblioteca. El pie de foto
// (`caption`) es también el texto alternativo en el portal.
export function propiedadesDeArchivo(archivo) {
  return {
    url: archivo.url,
    name: archivo.nombreOriginal ?? archivo.name ?? '',
    caption: archivo.textoAlternativo ?? '',
  };
}

// `uploadFile` del editor: valida el archivo, lo sube a la biblioteca y devuelve las propiedades del bloque.
// Si algo falla lanza un Error con el motivo (BlockNote muestra un aviso genérico de error de subida).
export async function subirArchivoDelEditor(archivo) {
  const clase = claseDeTipo(tipoDelArchivo(archivo));
  if (clase !== 'IMAGEN' && clase !== 'VIDEO') {
    throw new Error('Solo se pueden insertar imágenes (JPG, PNG, WebP) o videos (MP4, WebM).');
  }

  const rechazo = validarArchivoCliente(archivo);
  if (rechazo) throw new Error(rechazo.mensaje);

  const subido = await subirArchivo({ archivo });
  return { props: propiedadesDeArchivo(subido) };
}
