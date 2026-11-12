import { AlertCircle, Inbox, RotateCw } from 'lucide-react';

import '../../styles/EstadoSeccion.css';

export function CargandoSeccion({
  alturaMinima = 180,
  etiqueta = 'Cargando contenido',
  oscuro = false,
  lineas = 3,
}) {
  return (
    <div
      className={`estado-seccion estado-seccion-cargando ${oscuro ? 'estado-seccion-oscuro' : ''}`}
      style={{ minHeight: alturaMinima }}
      role="status"
      aria-label={etiqueta}
    >
      <div className="estado-esqueleto-barras" aria-hidden="true">
        {Array.from({ length: lineas }, (_, indice) => (
          <span
            key={indice}
            className="estado-esqueleto-barra"
            style={{ width: indice === lineas - 1 ? '62%' : '100%' }}
          />
        ))}
      </div>
      <span className="sr-only">{etiqueta}</span>
    </div>
  );
}

export function ErrorSeccion({
  mensaje = 'No pudimos cargar esta información.',
  onReintentar,
  oscuro = false,
  compacta = false,
}) {
  return (
    <div
      className={`estado-seccion ${oscuro ? 'estado-seccion-oscuro' : ''} ${
        compacta ? 'estado-seccion-compacta' : ''
      }`}
      role="alert"
    >
      <AlertCircle className="estado-seccion-icono-error" size={20} aria-hidden="true" />
      <p className="estado-seccion-texto">{mensaje}</p>
      {onReintentar && (
        <button
          type="button"
          className="estado-seccion-reintentar"
          onClick={onReintentar}
        >
          <RotateCw size={14} aria-hidden="true" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function SinResultados({
  mensaje = 'No hay elementos disponibles por el momento.',
  oscuro = false,
  compacta = false,
}) {
  return (
    <div
      className={`estado-seccion ${oscuro ? 'estado-seccion-oscuro' : ''} ${
        compacta ? 'estado-seccion-compacta' : ''
      }`}
    >
      <Inbox className="estado-seccion-icono" size={20} aria-hidden="true" />
      <p className="estado-seccion-texto">{mensaje}</p>
    </div>
  );
}
