import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../componentes/ConfirmarAccion.jsx';
import Dialogo from '../componentes/Dialogo.jsx';
import { Aviso, Boton, CampoTexto, Insignia, useToast } from '../ui/index.js';
import {
  agregarPublicacion,
  cambiarFechaPublicacion,
  CLAVE_PROCLAMAS,
  MAX_PUBLICACIONES,
  quitarPublicacion,
} from './api.js';
import { estaPublicada, formatearDia, ordinal, sumarDias } from './fechas.js';

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
          <Boton variante="secundario" onClick={onCancelar} disabled={pendiente}>
            Cancelar
          </Boton>
          <Boton type="submit" variante="primario" cargando={pendiente} disabled={!fecha}>
            Guardar
          </Boton>
        </div>
      </form>
    </Dialogo>
  );
}

// Historial de publicaciones de una proclama (RF-02): hasta 3, una por semana. Se agrega la siguiente,
// se cambia la fecha de cualquiera y solo se quita la última. Sin `editable`, es solo lectura.
export default function PublicacionesProclama({ proclama, editable }) {
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const tituloRef = useRef(null);
  const { publicaciones } = proclama;
  const siguiente = publicaciones.length + 1;
  const ultima = publicaciones[publicaciones.length - 1];
  const [fechaNueva, setFechaNueva] = useState('');
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
      toast.exito(`Se agregó la ${ordinal(siguiente)} proclama.`);
    },
  });
  const cambiar = useMutation({
    mutationFn: ({ numero, fecha }) => cambiarFechaPublicacion(proclama.id, numero, fecha),
    onSuccess: (actualizada, { numero }) => {
      refrescar(actualizada);
      setCambiando(null);
      toast.exito(`Se cambió la fecha de la ${ordinal(numero)} proclama.`);
    },
  });
  const quitar = useMutation({
    mutationFn: ({ numero }) => quitarPublicacion(proclama.id, numero),
    onSuccess: (actualizada, { numero }) => {
      refrescar(actualizada);
      setQuitando(null);
      toast.exito(`Se quitó la ${ordinal(numero)} proclama.`);
      setTimeout(() => tituloRef.current?.focus(), 0);
    },
  });

  return (
    <section aria-labelledby="historial-proclama" className="mt-10 border-t border-sand pt-6">
      <h2
        id="historial-proclama"
        ref={tituloRef}
        tabIndex={-1}
        className="font-body text-xl font-semibold text-ink outline-none"
      >
        Publicaciones
      </h2>
      <p className="mt-1 text-sm text-muted">
        Una proclama se publica hasta 3 veces, antes del matrimonio. En el portal aparece cuando llega su fecha.
      </p>

      {publicaciones.length ? (
        <ol aria-label="Historial de publicaciones" className="mt-4 flex flex-col gap-2">
          {publicaciones.map((pub) => {
            const publicada = estaPublicada(pub);
            const esUltima = pub.numero === ultima.numero;
            return (
              <li
                key={pub.numero}
                className="flex flex-col gap-2 rounded-lg border border-sand bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">{ordinal(pub.numero)} proclama</span>
                  <span className="text-muted">{formatearDia(pub.fecha)}</span>
                  <Insignia variante={publicada ? 'publicado' : 'programado'}>
                    {publicada ? 'Publicada' : 'Programada'}
                  </Insignia>
                </p>
                {editable && (
                  <div className="flex gap-2">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={Pencil}
                      onClick={() => setCambiando(pub)}
                      aria-label={`Cambiar la fecha de la ${ordinal(pub.numero)} proclama`}
                    >
                      Cambiar fecha
                    </Boton>
                    {esUltima && (
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        icono={Trash2}
                        onClick={() => setQuitando(pub)}
                        aria-label={`Quitar la ${ordinal(pub.numero)} proclama`}
                      >
                        Quitar
                      </Boton>
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
            className="mt-5 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:w-64">
                <CampoTexto
                  etiqueta={`Fecha de la ${ordinal(siguiente)} proclama`}
                  type="date"
                  value={fechaNueva}
                  min={ultima ? sumarDias(ultima.fecha, 1) : undefined}
                  onChange={(e) => setFechaNueva(e.target.value)}
                />
              </div>
              <Boton
                type="submit"
                variante="primario"
                icono={CalendarPlus}
                cargando={agregar.isPending}
                disabled={!fechaNueva}
              >
                Agregar proclama
              </Boton>
            </div>
            {agregar.error && (
              <Aviso tipo="error" className="sm:max-w-lg">
                {mensajeDe(agregar.error)}
              </Aviso>
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
