import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import ConfirmarBorrado from '../componentes/ConfirmarBorrado.jsx';
import EstadoLista from '../componentes/EstadoLista.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import {
  actualizarPreguntaFrecuente,
  CLAVE_SERVICIOS,
  crearPreguntaFrecuente,
  eliminarPreguntaFrecuente,
  obtenerServicio,
  reordenarPreguntasFrecuentes,
} from './api.js';

function FormularioPregunta({ servicioId, preguntaActual, onGuardado, onCancelar }) {
  const esEdicion = Boolean(preguntaActual);
  const idActiva = useId();
  const [pregunta, setPregunta] = useState(preguntaActual?.pregunta ?? '');
  const [respuesta, setRespuesta] = useState(preguntaActual?.respuesta ?? '');
  const [activa, setActiva] = useState(preguntaActual?.activa ?? true);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) =>
      esEdicion
        ? actualizarPreguntaFrecuente(servicioId, preguntaActual.id, cuerpo)
        : crearPreguntaFrecuente(servicioId, cuerpo),
    onSuccess: () => onGuardado(),
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(campos);
      setErrorGeneral(general);
    },
  });

  function enviar(evento) {
    evento.preventDefault();
    setErroresCampo({});
    setErrorGeneral('');
    mutate({
      pregunta: pregunta.trim(),
      respuesta: respuesta.trim(),
      activa,
    });
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-cream/50 p-4"
    >
      <h3 className="font-semibold text-ink">
        {esEdicion ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente'}
      </h3>

      {errorGeneral && (
        <p
          role="alert"
          className="rounded-md border border-redParish/30 bg-redParish/5 px-3 py-2 text-sm text-redParish"
        >
          {errorGeneral}
        </p>
      )}

      <CampoTexto
        etiqueta="Pregunta"
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        maxLength={300}
        error={erroresCampo.pregunta}
        disabled={isPending}
      />

      <CampoArea
        etiqueta="Respuesta"
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        maxLength={2000}
        rows={3}
        error={erroresCampo.respuesta}
        disabled={isPending}
      />

      <label htmlFor={idActiva} className="flex items-center gap-2 text-sm text-ink">
        <input
          id={idActiva}
          type="checkbox"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          disabled={isPending}
          className="size-4 rounded border-borderSoft accent-goldDark"
        />
        Activa en el portal y asistente virtual
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          disabled={isPending}
          className="rounded-md border border-borderSoft bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white disabled:opacity-60"
        >
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar pregunta' : 'Agregar pregunta'}
        </button>
      </div>
    </form>
  );
}

export default function PreguntasFrecuentes({ servicio, puedeGestionar, onCerrar }) {
  const queryClient = useQueryClient();
  const [formAbierto, setFormAbierto] = useState(null); // null | 'nueva' | objeto pregunta
  const [porEliminar, setPorEliminar] = useState(null);
  const [aviso, setAviso] = useState('');

  const detalleQuery = useQuery({
    queryKey: [...CLAVE_SERVICIOS, servicio.id],
    queryFn: () => obtenerServicio(servicio.id),
  });

  const reordenarMut = useMutation({
    mutationFn: (ids) => reordenarPreguntasFrecuentes(servicio.id, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...CLAVE_SERVICIOS, servicio.id] });
      queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
    },
  });

  const preguntas = detalleQuery.data?.preguntasFrecuentes ?? [];

  function recargar(mensaje) {
    setFormAbierto(null);
    setAviso(mensaje);
    queryClient.invalidateQueries({ queryKey: [...CLAVE_SERVICIOS, servicio.id] });
    queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
  }

  function mover(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= preguntas.length) return;
    const ids = preguntas.map((p) => p.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    reordenarMut.mutate(ids);
  }

  async function confirmarBorrado() {
    await eliminarPreguntaFrecuente(servicio.id, porEliminar.id);
    setPorEliminar(null);
    recargar('Se eliminó la pregunta frecuente.');
  }

  return (
    <Dialogo
      titulo={`Preguntas frecuentes · ${servicio.nombre}`}
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className={aviso ? 'rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark' : 'sr-only'}
        >
          {aviso}
        </p>

        {puedeGestionar && !formAbierto && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setAviso('');
                setFormAbierto('nueva');
              }}
              className="flex items-center gap-1.5 rounded-md bg-gold px-3.5 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark"
            >
              <Plus className="size-4" aria-hidden="true" />
              Nueva pregunta
            </button>
          </div>
        )}

        {formAbierto && (
          <FormularioPregunta
            servicioId={servicio.id}
            preguntaActual={formAbierto === 'nueva' ? null : formAbierto}
            onCancelar={() => setFormAbierto(null)}
            onGuardado={() =>
              recargar(
                formAbierto === 'nueva'
                  ? 'Se agregó la pregunta frecuente.'
                  : 'Se actualizó la pregunta frecuente.',
              )
            }
          />
        )}

        <EstadoLista
          cargando={detalleQuery.isPending}
          error={detalleQuery.error}
          vacio={!detalleQuery.isPending && !detalleQuery.error && preguntas.length === 0}
          textoCargando="Cargando preguntas frecuentes…"
          textoVacio="Este servicio todavía no tiene preguntas frecuentes."
          onReintentar={() => detalleQuery.refetch()}
        />

        {preguntas.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Lista de preguntas frecuentes">
            {preguntas.map((pf, i) => (
              <li
                key={pf.id}
                className="rounded-lg border border-borderSoft bg-white p-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{pf.pregunta}</p>
                      {!pf.activa && (
                        <span className="rounded-full bg-stone px-2 py-0.5 text-xs font-medium text-muted">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-charcoal">{pf.respuesta}</p>
                  </div>

                  {puedeGestionar && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0 || reordenarMut.isPending}
                        aria-label={`Subir pregunta ${i + 1}`}
                        className="rounded-md border border-borderSoft p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => mover(i, 1)}
                        disabled={i === preguntas.length - 1 || reordenarMut.isPending}
                        aria-label={`Bajar pregunta ${i + 1}`}
                        className="rounded-md border border-borderSoft p-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-40"
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setFormAbierto(pf);
                        }}
                        aria-label={`Editar pregunta ${i + 1}`}
                        className="rounded-md border border-borderSoft p-1.5 text-ink hover:bg-stone"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso('');
                          setPorEliminar(pf);
                        }}
                        aria-label={`Eliminar pregunta ${i + 1}`}
                        className="rounded-md border border-redParish/30 p-1.5 text-redParish hover:bg-redParish/5"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {porEliminar && (
        <ConfirmarBorrado
          titulo="¿Eliminar pregunta frecuente?"
          descripcion={`Se eliminará «${porEliminar.pregunta}». Esta acción no se puede deshacer.`}
          onConfirmar={confirmarBorrado}
          onCancelar={() => setPorEliminar(null)}
        />
      )}
    </Dialogo>
  );
}

