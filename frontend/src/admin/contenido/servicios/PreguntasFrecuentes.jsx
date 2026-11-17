import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

import ConfirmarAccion from '../../componentes/ConfirmarAccion.jsx';
import Dialogo from '../../componentes/Dialogo.jsx';
import {
  Aviso,
  Boton,
  CampoArea,
  CampoCasilla,
  CampoTexto,
  EsqueletoTarjetas,
  EstadoVacio,
  Insignia,
  useToast,
} from '../../ui/index.js';
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
      className="flex flex-col gap-3 rounded-lg border border-sand bg-panel p-4"
    >
      <h3 className="font-semibold text-ink">
        {esEdicion ? 'Editar pregunta frecuente' : 'Nueva pregunta frecuente'}
      </h3>

      {errorGeneral && (
        <Aviso tipo="error">
          <p>{errorGeneral}</p>
        </Aviso>
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

      <CampoCasilla
        etiqueta="Activa en el portal y asistente virtual"
        checked={activa}
        onChange={(e) => setActiva(e.target.checked)}
        disabled={isPending}
      />

      <div className="flex justify-end gap-2">
        <Boton variante="secundario" tamano="sm" onClick={onCancelar} disabled={isPending}>
          Cancelar
        </Boton>
        <Boton type="submit" variante="primario" tamano="sm" cargando={isPending}>
          {esEdicion ? 'Guardar pregunta' : 'Agregar pregunta'}
        </Boton>
      </div>
    </form>
  );
}

export default function PreguntasFrecuentes({ servicio, puedeGestionar, onCerrar }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formAbierto, setFormAbierto] = useState(null); // null | 'nueva' | objeto pregunta
  const [porEliminar, setPorEliminar] = useState(null);

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
    toast.exito(mensaje);
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

  const eliminarMut = useMutation({
    mutationFn: (pregunta) => eliminarPreguntaFrecuente(servicio.id, pregunta.id),
    onSuccess: () => {
      setPorEliminar(null);
      recargar('Se eliminó la pregunta frecuente.');
    },
  });

  return (
    <Dialogo
      titulo={`Preguntas frecuentes · ${servicio.nombre}`}
      onCerrar={onCerrar}
      ancho="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        {puedeGestionar && !formAbierto && (
          <div className="flex justify-end">
            <Boton
              variante="primario"
              tamano="sm"
              icono={Plus}
              onClick={() => setFormAbierto('nueva')}
            >
              Nueva pregunta
            </Boton>
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

        {detalleQuery.isPending && (
          <EsqueletoTarjetas cantidad={2} columnas="grid-cols-1" etiqueta="Cargando preguntas frecuentes…" />
        )}

        {detalleQuery.error && (
          <Aviso
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm" onClick={() => detalleQuery.refetch()}>
                Reintentar
              </Boton>
            }
          >
            <p>{detalleQuery.error.message || 'No se pudieron cargar los datos.'}</p>
          </Aviso>
        )}

        {!detalleQuery.isPending && !detalleQuery.error && preguntas.length === 0 && (
          <EstadoVacio
            icono={Inbox}
            titulo="Este servicio todavía no tiene preguntas frecuentes."
          />
        )}

        {preguntas.length > 0 && (
          <ul className="flex flex-col gap-3" aria-label="Lista de preguntas frecuentes">
            {preguntas.map((pf, i) => (
              <li key={pf.id} className="rounded-lg border border-sand bg-white p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{pf.pregunta}</p>
                      {!pf.activa && <Insignia variante="archivado">Inactiva</Insignia>}
                    </div>
                    <p className="mt-1 text-sm text-ink">{pf.respuesta}</p>
                  </div>

                  {puedeGestionar && (
                    <div className="flex items-center gap-1">
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => mover(i, -1)}
                        disabled={i === 0 || reordenarMut.isPending}
                        aria-label={`Subir pregunta ${i + 1}`}
                      >
                        <ArrowUp className="size-3.5" aria-hidden="true" />
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => mover(i, 1)}
                        disabled={i === preguntas.length - 1 || reordenarMut.isPending}
                        aria-label={`Bajar pregunta ${i + 1}`}
                      >
                        <ArrowDown className="size-3.5" aria-hidden="true" />
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => setFormAbierto(pf)}
                        aria-label={`Editar pregunta ${i + 1}`}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Boton>
                      <Boton
                        variante="secundario"
                        tamano="sm"
                        onClick={() => setPorEliminar(pf)}
                        aria-label={`Eliminar pregunta ${i + 1}`}
                      >
                        <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                      </Boton>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {porEliminar && (
        <ConfirmarAccion
          titulo="¿Eliminar pregunta frecuente?"
          pendiente={eliminarMut.isPending}
          error={eliminarMut.error}
          onConfirmar={() => eliminarMut.mutate(porEliminar)}
          onCancelar={() => {
            eliminarMut.reset();
            setPorEliminar(null);
          }}
        >
          Se eliminará «{porEliminar.pregunta}». Esta acción no se puede deshacer.
        </ConfirmarAccion>
      )}
    </Dialogo>
  );
}
