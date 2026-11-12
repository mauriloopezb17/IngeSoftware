// Cliente HTTP compartido por el portal y el panel CMS.
// Todas las llamadas a la API pasan por aquí.

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Error de la API. Convención de cuerpo de error del backend:
// { "error": { "codigo": "...", "mensaje": "...", "detalles": [...] } }
export class ErrorApi extends Error {
  constructor({ estado, mensaje, codigo = null, detalles = null }) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado; // 0 cuando no hubo respuesta (red caída)
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

function construirUrl(ruta, parametros) {
  const url = new URL(`${BASE_URL}${ruta}`, window.location.origin);

  for (const [clave, valor] of Object.entries(parametros ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, String(valor));
    }
  }

  return url;
}

async function leerCuerpo(respuesta) {
  if (respuesta.status === 204) return null;

  const tipo = respuesta.headers.get('content-type') ?? '';
  return tipo.includes('application/json') ? respuesta.json() : null;
}

async function solicitar(metodo, ruta, { parametros, cuerpo, senal } = {}) {
  const opciones = {
    method: metodo,
    credentials: 'include', // envía la cookie de sesión del panel
    headers: { Accept: 'application/json' },
    signal: senal,
  };

  if (cuerpo instanceof FormData) {
    // El navegador define el Content-Type con el boundary correcto.
    opciones.body = cuerpo;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;

  try {
    respuesta = await fetch(construirUrl(ruta, parametros), opciones);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ErrorApi({ estado: 0, mensaje: 'No se pudo conectar con el servidor.' });
  }

  const datos = await leerCuerpo(respuesta).catch(() => null);

  if (!respuesta.ok) {
    throw new ErrorApi({
      estado: respuesta.status,
      mensaje:
        datos?.error?.mensaje ?? datos?.mensaje ?? respuesta.statusText ?? 'Error del servidor.',
      codigo: datos?.error?.codigo ?? null,
      detalles: datos?.error?.detalles ?? null,
    });
  }

  return datos;
}

export const clienteHttp = {
  get: (ruta, opciones) => solicitar('GET', ruta, opciones),
  post: (ruta, cuerpo, opciones) => solicitar('POST', ruta, { ...opciones, cuerpo }),
  put: (ruta, cuerpo, opciones) => solicitar('PUT', ruta, { ...opciones, cuerpo }),
  patch: (ruta, cuerpo, opciones) => solicitar('PATCH', ruta, { ...opciones, cuerpo }),
  delete: (ruta, opciones) => solicitar('DELETE', ruta, opciones),
};
