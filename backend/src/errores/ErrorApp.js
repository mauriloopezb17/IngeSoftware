// Errores de la API con el formato del contrato (docs/api/convenciones.md, sección 5):
// { "error": { "codigo", "mensaje", "detalles": [{ "campo", "mensaje" }] } }

// Código del contrato -> estado HTTP.
export const CODIGOS_ERROR = Object.freeze({
  VALIDACION: 400,
  NO_AUTENTICADO: 401,
  SIN_PERMISO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  ARCHIVO_DEMASIADO_GRANDE: 413,
  TIPO_NO_PERMITIDO: 415,
  DEMASIADAS_SOLICITUDES: 429,
  ERROR_INTERNO: 500,
});

export class ErrorApp extends Error {
  // codigo: uno de CODIGOS_ERROR. El estado HTTP sale del código.
  // detalles: lista de { campo, mensaje } (sobre todo para VALIDACION).
  constructor(codigo, mensaje, detalles = []) {
    if (!(codigo in CODIGOS_ERROR)) {
      throw new TypeError(`Código de error desconocido: ${codigo}`);
    }
    super(mensaje);
    this.name = 'ErrorApp';
    this.codigo = codigo;
    this.estado = CODIGOS_ERROR[codigo];
    this.detalles = detalles;
  }

  static validacion(mensaje = 'Los datos enviados no son válidos.', detalles = []) {
    return new ErrorApp('VALIDACION', mensaje, detalles);
  }

  static noAutenticado(mensaje = 'Debes iniciar sesión.') {
    return new ErrorApp('NO_AUTENTICADO', mensaje);
  }

  static sinPermiso(mensaje = 'No tienes permiso para realizar esta acción.') {
    return new ErrorApp('SIN_PERMISO', mensaje);
  }

  static noEncontrado(mensaje = 'El recurso no existe.') {
    return new ErrorApp('NO_ENCONTRADO', mensaje);
  }

  static conflicto(mensaje, detalles = []) {
    return new ErrorApp('CONFLICTO', mensaje, detalles);
  }

  // 429 con la cabecera Retry-After (segundos que faltan), que pone el manejador de errores.
  static demasiadasSolicitudes(mensaje, reintentarEnSegundos) {
    const error = new ErrorApp('DEMASIADAS_SOLICITUDES', mensaje);
    error.reintentarEnSegundos = reintentarEnSegundos;
    return error;
  }

  // Cuerpo de la respuesta según el contrato.
  aRespuesta() {
    return { error: { codigo: this.codigo, mensaje: this.message, detalles: this.detalles } };
  }
}
