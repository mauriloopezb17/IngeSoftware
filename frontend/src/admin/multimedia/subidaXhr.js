// Subida de un archivo con progreso y cancelación. `fetch` no informa el avance de la subida, así que este
// único endpoint usa XMLHttpRequest con `upload.onprogress` (admin.md §2, nota de POST /admin/multimedia).
// Los errores salen como los de clienteHttp (ErrorApi), para que el resto del panel los trate igual
// (por ejemplo, un 401 hace volver al login).
import { ErrorApi } from '../../services/clienteHttp.js';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Error de una subida cancelada por el usuario: no es un fallo, quien llama lo distingue por su nombre.
export function crearErrorCancelada() {
  return new DOMException('La subida se canceló.', 'AbortError');
}

export const fueCancelada = (error) => error?.name === 'AbortError';

function leerJson(texto) {
  try {
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

// Envía `formulario` (multipart/form-data) a `ruta` con POST.
//   onProgreso(porcentaje): entero de 0 a 100 de lo ENVIADO. Al llegar a 100 el servidor todavía puede estar
//   procesando el archivo (las imágenes se convierten a WebP): la respuesta llega después.
//   senal: AbortSignal; al abortarla se corta la subida y la promesa se rechaza con un AbortError.
// Devuelve el cuerpo de la respuesta (`{ datos }`).
export function subirFormulario(ruta, formulario, { onProgreso, senal } = {}) {
  return new Promise((resolver, rechazar) => {
    if (senal?.aborted) {
      rechazar(crearErrorCancelada());
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}${ruta}`);
    xhr.withCredentials = true; // envía la cookie de sesión del panel
    xhr.setRequestHeader('Accept', 'application/json');
    // Sin Content-Type: el navegador pone el boundary del multipart.

    const alAbortar = () => xhr.abort();
    senal?.addEventListener('abort', alAbortar, { once: true });
    const limpiar = () => senal?.removeEventListener('abort', alAbortar);

    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) {
        onProgreso?.(Math.min(100, Math.round((evento.loaded / evento.total) * 100)));
      }
    };

    xhr.onload = () => {
      limpiar();
      const cuerpo = leerJson(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgreso?.(100);
        resolver(cuerpo);
        return;
      }
      rechazar(
        new ErrorApi({
          estado: xhr.status,
          mensaje: cuerpo?.error?.mensaje ?? cuerpo?.mensaje ?? (xhr.statusText || 'Error del servidor.'),
          codigo: cuerpo?.error?.codigo ?? null,
          detalles: cuerpo?.error?.detalles ?? null,
        }),
      );
    };

    xhr.onerror = () => {
      limpiar();
      rechazar(new ErrorApi({ estado: 0, mensaje: 'No se pudo conectar con el servidor.' }));
    };

    xhr.onabort = () => {
      limpiar();
      rechazar(crearErrorCancelada());
    };

    xhr.send(formulario);
  });
}
