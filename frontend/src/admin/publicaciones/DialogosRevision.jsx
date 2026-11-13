import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { aprobarPublicacion, OBSERVACION_MAX, OBSERVACION_MIN, rechazarPublicacion } from './api.js';
import { aCampoFecha, deCampoFecha } from './fechas.js';

const estiloControl =
  'w-full rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark';

// Mensaje del error de la API más el detalle por campo, si lo trae.
function MensajeDeError({ error }) {
  if (!error) return null;
  const detalles = error.detalles ?? [];
  return (
    <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-redParish/30 bg-redParish/5 p-3 text-sm text-redParish">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p>{error.message}</p>
        {detalles.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {detalles.map(({ campo, mensaje }) => (
              <li key={`${campo}-${mensaje}`}>{mensaje}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Aprobar publica la noticia ahora, o en la fecha que se indique (queda programada si es futura).
export function DialogoAprobar({ publicacion, onCerrar, onHecho }) {
  const idFecha = useId();
  const [fecha, setFecha] = useState(() => aCampoFecha(publicacion.fechaPublicacion));

  const aprobar = useMutation({
    mutationFn: () => aprobarPublicacion(publicacion.id, fecha ? { fechaPublicacion: deCampoFecha(fecha) } : {}),
    onSuccess: () => onHecho(`«${publicacion.titulo}» fue aprobada y publicada.`),
  });

  return (
    <Dialogo titulo="Aprobar publicación" onCerrar={onCerrar} ancho="max-w-md">
      <p className="text-sm text-charcoal">
        «{publicacion.titulo}» pasará a publicada y se verá en el portal en su fecha de publicación.
      </p>
      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor={idFecha} className="text-sm font-semibold text-ink">
          Fecha de publicación (opcional)
        </label>
        <input
          id={idFecha}
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${estiloControl} border-borderSoft`}
        />
        <p className="text-xs text-muted">Hora de Bolivia. Si la dejas vacía se publica ahora; una fecha futura la programa.</p>
      </div>
      <MensajeDeError error={aprobar.error} />
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onCerrar}
          disabled={aprobar.isPending}
          className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => aprobar.mutate()}
          disabled={aprobar.isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {aprobar.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          Aprobar y publicar
        </button>
      </div>
    </Dialogo>
  );
}

// Rechazar devuelve la publicación a borrador con una observación obligatoria que verá su autor.
export function DialogoRechazar({ publicacion, onCerrar, onHecho }) {
  const idObservacion = useId();
  const [observacion, setObservacion] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const rechazar = useMutation({
    mutationFn: (texto) => rechazarPublicacion(publicacion.id, texto),
    onSuccess: () => onHecho(`«${publicacion.titulo}» volvió a borrador con tu observación.`),
  });

  function enviar(evento) {
    evento.preventDefault();
    const texto = observacion.trim();
    if (texto.length < OBSERVACION_MIN || texto.length > OBSERVACION_MAX) {
      setErrorLocal(`La observación es obligatoria, de ${OBSERVACION_MIN} a ${OBSERVACION_MAX} caracteres.`);
      return;
    }
    setErrorLocal('');
    rechazar.mutate(texto);
  }

  const idError = `${idObservacion}-error`;

  return (
    <Dialogo titulo="Rechazar publicación" onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={enviar} noValidate>
        <p className="text-sm text-charcoal">
          «{publicacion.titulo}» volverá a borrador. Explica qué debe corregir {publicacion.autor.nombreCompleto}.
        </p>
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={idObservacion} className="text-sm font-semibold text-ink">
            Observación
          </label>
          <textarea
            id={idObservacion}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            maxLength={OBSERVACION_MAX}
            rows={5}
            aria-invalid={errorLocal ? 'true' : undefined}
            aria-describedby={errorLocal ? idError : undefined}
            className={`${estiloControl} ${errorLocal ? 'border-redParish' : 'border-borderSoft'}`}
          />
          <p className="text-xs text-muted" aria-live="polite">
            {observacion.length}/{OBSERVACION_MAX} caracteres (mínimo {OBSERVACION_MIN})
          </p>
          {errorLocal && (
            <p id={idError} className="text-sm text-redParish">
              {errorLocal}
            </p>
          )}
        </div>
        <MensajeDeError error={rechazar.error} />
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={rechazar.isPending}
            className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={rechazar.isPending}
            className="flex items-center gap-2 rounded-md border border-redParish/40 bg-white px-4 py-2 text-sm font-semibold text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rechazar.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <X className="size-4" aria-hidden="true" />
            )}
            Rechazar publicación
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
