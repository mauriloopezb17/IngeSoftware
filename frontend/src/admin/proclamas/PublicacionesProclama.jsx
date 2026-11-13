import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Loader2, Pencil, Trash2 } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import { useEnfocarAviso } from '../componentes/useEnfocarAviso.js';
import Dialogo from '../componentes/Dialogo.jsx';
import {
  agregarPublicacion,
  cambiarFechaPublicacion,
  CLAVE_PROCLAMAS,
  MAX_PUBLICACIONES,
  quitarPublicacion,
} from './api.js';
import { estaPublicada, formatearDia, ordinal, sumarDias } from './fechas.js';

const botonFila =
  'inline-flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark';

// Mensaje de un error de la API sobre una fecha (400 con detalle o 409).
const mensajeDe = (error) => error?.detalles?.[0]?.mensaje ?? error?.message;

function DialogoFecha({ titulo, fechaInicial, pendiente, error, onGuardar, onCancelar }) {
  const [fecha, setFecha] = useState(fechaInicial);
  return (
    <Dialogo titulo={titulo} onCerrar={pendiente ? () => {} : onCancelar} ancho="max-w-sm">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onGuardar(fecha);
        }}
        className="flex flex-col gap-4"
      >
        <CampoTexto
          etiqueta="Fecha de publicación"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={error ? mensajeDe(error) : undefined}
          required
        />
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={pendiente}
            className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pendiente || !fecha}
            className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Guardar
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

// Historial de publicaciones de una proclama (RF-02): hasta 3, una por semana. Se agrega la siguiente,
// se cambia la fecha de cualquiera y solo se quita la última. Sin `editable`, es solo lectura.
export default function PublicacionesProclama({ proclama, editable }) {
  const clienteConsultas = useQueryClient();
  const idNueva = useId();
  const { publicaciones } = proclama;
  const siguiente = publicaciones.length + 1;
  const ultima = publicaciones[publicaciones.length - 1];
  const [fechaNueva, setFechaNueva] = useState('');
  const [aviso, setAviso] = useState('');
  // El botón de una publicación quitada desaparece: el foco pasa al mensaje de confirmación.
  const avisoRef = useEnfocarAviso(aviso);
  const [cambiando, setCambiando] = useState(null); // publicación cuya fecha se cambia
  const [quitando, setQuitando] = useState(null);

  // Las tres acciones responden con la proclama completa: se usa para el detalle sin volver a pedirlo,
  // y se invalidan las listas (vigente y numeroProclama pueden cambiar).
  const refrescar = (actualizada) => {
    clienteConsultas.setQueryData([...CLAVE_PROCLAMAS, 'detalle', String(proclama.id)], actualizada);
    clienteConsultas.invalidateQueries({ queryKey: [...CLAVE_PROCLAMAS, 'lista'] });
  };

  const agregar = useMutation({
    mutationFn: () => agregarPublicacion(proclama.id, fechaNueva),
    onSuccess: (actualizada) => {
      refrescar(actualizada);
      setFechaNueva('');
      setAviso(`Se agregó la ${ordinal(siguiente)} proclama.`);
    },
  });
  const cambiar = useMutation({
    mutationFn: ({ numero, fecha }) => cambiarFechaPublicacion(proclama.id, numero, fecha),
    onSuccess: (actualizada, { numero }) => {
      refrescar(actualizada);
      setCambiando(null);
      setAviso(`Se cambió la fecha de la ${ordinal(numero)} proclama.`);
    },
  });
  const quitar = useMutation({
    mutationFn: ({ numero }) => quitarPublicacion(proclama.id, numero),
    onSuccess: (actualizada, { numero }) => {
      refrescar(actualizada);
      setQuitando(null);
      setAviso(`Se quitó la ${ordinal(numero)} proclama.`);
    },
  });

  return (
    <section aria-labelledby="historial-proclama" className="mt-10 border-t border-borderSoft pt-6">
      <h2 id="historial-proclama" className="font-display text-2xl font-semibold text-ink">
        Publicaciones
      </h2>
      <p className="mt-1 text-sm text-muted">
        Una proclama se publica hasta 3 veces, antes del matrimonio. En el portal aparece cuando llega su fecha.
      </p>

      {aviso && (
        <p
          ref={avisoRef}
          role="status"
          tabIndex={-1}
          className="mt-3 rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark outline-none focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          {aviso}
        </p>
      )}

      {publicaciones.length ? (
        <ol aria-label="Historial de publicaciones" className="mt-4 flex flex-col gap-2">
          {publicaciones.map((pub) => {
            const publicada = estaPublicada(pub);
            const esUltima = pub.numero === ultima.numero;
            return (
              <li
                key={pub.numero}
                className="flex flex-col gap-2 rounded-lg border border-borderSoft bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">{ordinal(pub.numero)} proclama</span>
                  <span className="text-charcoal">{formatearDia(pub.fecha)}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      publicada ? 'bg-green-100 text-green-800' : 'bg-goldPale text-goldDark'
                    }`}
                  >
                    {publicada ? 'Publicada' : 'Programada'}
                  </span>
                </p>
                {editable && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCambiando(pub)}
                      aria-label={`Cambiar la fecha de la ${ordinal(pub.numero)} proclama`}
                      className={botonFila}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" /> Cambiar fecha
                    </button>
                    {esUltima && (
                      <button
                        type="button"
                        onClick={() => setQuitando(pub)}
                        aria-label={`Quitar la ${ordinal(pub.numero)} proclama`}
                        className={botonFila}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" /> Quitar
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">Todavía no tiene publicaciones.</p>
      )}

      {editable &&
        (publicaciones.length < MAX_PUBLICACIONES ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              agregar.mutate();
            }}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={idNueva} className="text-sm font-semibold text-ink">
                Fecha de la {ordinal(siguiente)} proclama
              </label>
              <input
                id={idNueva}
                type="date"
                value={fechaNueva}
                min={ultima ? sumarDias(ultima.fecha, 1) : undefined}
                onChange={(e) => setFechaNueva(e.target.value)}
                aria-invalid={agregar.error ? 'true' : undefined}
                aria-describedby={agregar.error ? `${idNueva}-error` : undefined}
                className={`rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark ${
                  agregar.error ? 'border-redParish' : 'border-borderSoft'
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!fechaNueva || agregar.isPending}
              className="flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {agregar.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CalendarPlus className="size-4" aria-hidden="true" />
              )}
              Agregar proclama
            </button>
            {agregar.error && (
              <p id={`${idNueva}-error`} role="alert" className="text-sm text-redParish">
                {mensajeDe(agregar.error)}
              </p>
            )}
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">Ya tiene las {MAX_PUBLICACIONES} publicaciones.</p>
        ))}

      {cambiando && (
        <DialogoFecha
          titulo={`Cambiar la fecha de la ${ordinal(cambiando.numero)} proclama`}
          fechaInicial={cambiando.fecha}
          pendiente={cambiar.isPending}
          error={cambiar.error}
          onGuardar={(fecha) => cambiar.mutate({ numero: cambiando.numero, fecha })}
          onCancelar={() => {
            cambiar.reset();
            setCambiando(null);
          }}
        />
      )}

      {quitando && (
        <ConfirmarAccion
          titulo={`¿Quitar la ${ordinal(quitando.numero)} proclama?`}
          textoConfirmar="Quitar"
          pendiente={quitar.isPending}
          error={quitar.error}
          onConfirmar={() => quitar.mutate(quitando)}
          onCancelar={() => {
            quitar.reset();
            setQuitando(null);
          }}
        >
          Se quita del historial ({formatearDia(quitando.fecha)}). Si ya salió en el portal, dejará de verse.
        </ConfirmarAccion>
      )}
    </section>
  );
}
