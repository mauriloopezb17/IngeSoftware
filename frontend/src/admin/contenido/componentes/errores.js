// Utilidades para mapear errores 400 VALIDACION del contrato (docs/api/convenciones.md §5).
import { ErrorApi } from '../../../services/clienteHttp.js';

export function extraerErroresApi(error) {
  if (!(error instanceof ErrorApi)) {
    return { general: error?.message ?? 'Ocurrió un error inesperado.', campos: {} };
  }

  const campos = {};
  if (error.codigo === 'VALIDACION' && Array.isArray(error.detalles)) {
    for (const detalle of error.detalles) {
      if (detalle?.campo && detalle?.mensaje && !(detalle.campo in campos)) {
        campos[detalle.campo] = detalle.mensaje;
      }
    }
  }

  const general =
    Object.keys(campos).length > 0 && error.codigo === 'VALIDACION'
      ? ''
      : error.message || 'No se pudo completar la operación.';

  return { general, campos };
}

