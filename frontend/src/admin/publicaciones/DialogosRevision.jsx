import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { Aviso, Boton, CampoArea, CampoTexto } from '../ui/index.js';
import { aprobarPublicacion, OBSERVACION_MAX, OBSERVACION_MIN, rechazarPublicacion } from './api.js';
import { aCampoFecha, deCampoFecha } from './fechas.js';

// Mensaje del error de la API más el detalle por campo, si lo trae.
function MensajeDeError({ error }) {
  if (!error) return null;
  const detalles = error.detalles ?? [];
  return (
    <Aviso tipo="error" className="mt-4">
      <p>{error.message}</p>
      {detalles.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {detalles.map(({ campo, mensaje }) => (
            <li key={`${campo}-${mensaje}`}>{mensaje}</li>
          ))}
        </ul>
      )}
    </Aviso>
  );
}

// Aprobar publica la noticia ahora, o en la fecha que se indique (queda programada si es futura).
export function DialogoAprobar({ publicacion, onCerrar, onHecho }) {
  const [fecha, setFecha] = useState(() => aCampoFecha(publicacion.fechaPublicacion));

  const aprobar = useMutation({
    mutationFn: () => aprobarPublicacion(publicacion.id, fecha ? { fechaPublicacion: deCampoFecha(fecha) } : {}),
    onSuccess: () => onHecho(`«${publicacion.titulo}» fue aprobada y publicada.`),
  });

  return (
    <Dialogo titulo="Aprobar publicación" onCerrar={onCerrar} ancho="max-w-md">
      <p className="text-sm text-ink">
        «{publicacion.titulo}» pasará a publicada y se verá en el portal en su fecha de publicación.
      </p>
      <div className="mt-4">
        <CampoTexto
          etiqueta="Fecha de publicación (opcional)"
          type="datetime-local"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          ayuda="Hora de Bolivia. Si la dejas vacía se publica ahora; una fecha futura la programa."
        />
      </div>
      <MensajeDeError error={aprobar.error} />
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Boton variante="secundario" onClick={onCerrar} disabled={aprobar.isPending}>
          Cancelar
        </Boton>
        <Boton
          variante="primario"
          icono={Check}
          onClick={() => aprobar.mutate()}
          cargando={aprobar.isPending}
        >
          Aprobar y publicar
        </Boton>
      </div>
    </Dialogo>
  );
}

// Rechazar devuelve la publicación a borrador con una observación obligatoria que verá su autor.
export function DialogoRechazar({ publicacion, onCerrar, onHecho }) {
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

  return (
    <Dialogo titulo="Rechazar publicación" onCerrar={onCerrar} ancho="max-w-lg">
      <form onSubmit={enviar} noValidate>
        <p className="text-sm text-ink">
          «{publicacion.titulo}» volverá a borrador. Explica qué debe corregir {publicacion.autor.nombreCompleto}.
        </p>
        <div className="mt-4">
          <CampoArea
            etiqueta="Observación"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            maxLength={OBSERVACION_MAX}
            rows={5}
            ayuda={`${observacion.length}/${OBSERVACION_MAX} caracteres (mínimo ${OBSERVACION_MIN})`}
            error={errorLocal}
          />
        </div>
        <MensajeDeError error={rechazar.error} />
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" onClick={onCerrar} disabled={rechazar.isPending}>
            Cancelar
          </Boton>
          <Boton
            type="submit"
            variante="peligro"
            icono={X}
            cargando={rechazar.isPending}
          >
            Rechazar publicación
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}
