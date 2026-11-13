import { useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';

import CampoArea from '../componentes/CampoArea.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import CampoTexto from '../componentes/CampoTexto.jsx';
import { erroresDe } from '../componentes/erroresFormulario.js';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../publicaciones/api.js';
import { actualizarEvento, CLAVE_EVENTOS, crearEvento, ESTADOS_EVENTO } from './api.js';
import { CAMPO_DE_ERROR, camposDe, cuerpoDe, MAX_DESCRIPCION, MAX_LUGAR, validarLocal } from './campos.js';

const estiloControl =
  'w-full rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark';

// Día y hora de un extremo del evento. Con «todo el día» solo se pide el día.
function DiaYHora({ legend, ayuda, error, dia, hora, conHora, onCambiar, obligatorio }) {
  const id = useId();
  return (
    <fieldset aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ''}`} className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-dia`} className="text-xs font-semibold text-muted">
            Día
          </label>
          <input
            id={`${id}-dia`}
            type="date"
            value={dia}
            required={obligatorio}
            onChange={(e) => onCambiar({ dia: e.target.value })}
            aria-invalid={error ? 'true' : undefined}
            className={`${estiloControl} ${error ? 'border-redParish' : 'border-borderSoft'}`}
          />
        </div>
        {conHora && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-hora`} className="text-xs font-semibold text-muted">
              Hora
            </label>
            <input
              id={`${id}-hora`}
              type="time"
              value={hora}
              required={obligatorio}
              onChange={(e) => onCambiar({ hora: e.target.value })}
              aria-invalid={error ? 'true' : undefined}
              className={`${estiloControl} ${error ? 'border-redParish' : 'border-borderSoft'}`}
            />
          </div>
        )}
      </div>
      <p id={`${id}-ayuda`} className="text-xs text-muted">
        {ayuda}
      </p>
      {error && (
        <p id={`${id}-error`} className="text-sm text-redParish">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// Formulario de un evento del calendario (admin.md §4). `evento` (opcional): el que se edita.
export default function FormularioEvento({ evento }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const idTodoElDia = useId();
  const avisos = useRef(null);
  const editando = Boolean(evento);

  const [campos, setCampos] = useState(() => camposDe(evento));
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [eligiendoImagen, setEligiendoImagen] = useState(false);
  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  const catalogos = useQuery({ queryKey: CLAVE_CATALOGOS, queryFn: obtenerCatalogos, staleTime: 5 * 60 * 1000 });
  const categorias = catalogos.data?.categoriasEvento ?? [];

  function mostrarErrores(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarEvento(evento.id, cuerpo) : crearEvento(cuerpo)),
    onSuccess: (guardado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_EVENTOS });
      navegar('/admin/eventos', {
        state: { aviso: editando ? `Se guardaron los cambios de «${guardado.titulo}».` : `Se creó el evento «${guardado.titulo}».` },
      });
    },
    onError: (error) => {
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error, CAMPO_DE_ERROR);
      mostrarErrores(porCampo, avisosGenerales);
    },
  });

  function enviar(evento_) {
    evento_.preventDefault();
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      mostrarErrores(locales);
      return;
    }
    guardar.mutate(cuerpoDe(campos));
  }

  const mensajes = [...Object.values(errores), ...generales];

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-6">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajes.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">No se pudo guardar. Revisa lo siguiente:</p>
              <ul className="mt-1 list-disc pl-5">
                {mensajes.map((mensaje) => (
                  <li key={mensaje}>{mensaje}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <CampoTexto
            etiqueta="Título"
            value={campos.titulo}
            onChange={(e) => cambiar({ titulo: e.target.value })}
            error={errores.titulo}
            maxLength={200}
            required
            autoComplete="off"
          />

          <label htmlFor={idTodoElDia} className="flex items-center gap-2 text-sm font-medium">
            <input
              id={idTodoElDia}
              type="checkbox"
              checked={campos.todoElDia}
              onChange={(e) => cambiar({ todoElDia: e.target.checked })}
              className="size-4 accent-goldDark"
            />
            Todo el día
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <DiaYHora
              legend="Inicio"
              ayuda="Hora de Bolivia."
              obligatorio
              error={errores.fechaInicio}
              dia={campos.diaInicio}
              hora={campos.horaInicio}
              conHora={!campos.todoElDia}
              onCambiar={({ dia, hora }) =>
                cambiar(dia !== undefined ? { diaInicio: dia } : { horaInicio: hora })
              }
            />
            <DiaYHora
              legend="Fin (opcional)"
              ayuda={
                campos.todoElDia
                  ? 'Para un evento de varios días.'
                  : 'Si solo indicas la hora, termina el mismo día.'
              }
              error={errores.fechaFin}
              dia={campos.diaFin}
              hora={campos.horaFin}
              conHora={!campos.todoElDia}
              onCambiar={({ dia, hora }) => cambiar(dia !== undefined ? { diaFin: dia } : { horaFin: hora })}
            />
          </div>

          <CampoTexto
            etiqueta="Lugar (opcional)"
            value={campos.lugar}
            onChange={(e) => cambiar({ lugar: e.target.value })}
            error={errores.lugar}
            maxLength={MAX_LUGAR}
            autoComplete="off"
          />

          <CampoArea
            etiqueta="Descripción (opcional)"
            value={campos.descripcion}
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            error={errores.descripcion}
            maxLength={MAX_DESCRIPCION}
            ayuda="Texto plano."
          />
        </div>

        <div className="flex flex-col gap-6">
          <CampoSelect
            etiqueta="Categoría"
            value={campos.categoriaId}
            onChange={(e) => cambiar({ categoriaId: e.target.value })}
            error={errores.categoria ?? (catalogos.isError ? 'No se pudieron cargar las categorías.' : undefined)}
            disabled={catalogos.isPending}
            required
            opciones={[['', 'Elige una categoría'], ...categorias.map((c) => [String(c.id), c.nombre])]}
          />

          <CampoSelect
            etiqueta="Estado"
            value={campos.estado}
            onChange={(e) => cambiar({ estado: e.target.value })}
            error={errores.estado}
            ayuda="Los eventos se publican directamente, sin revisión. Un borrador no se ve en el portal."
            opciones={Object.entries(ESTADOS_EVENTO)}
          />

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-semibold text-ink">Imagen (opcional)</legend>
            {campos.imagen ? (
              <div className="flex flex-col gap-2 rounded-md border border-borderSoft bg-white p-2">
                <img
                  src={campos.imagen.url}
                  alt={campos.imagen.textoAlternativo ?? ''}
                  className="aspect-video w-full rounded object-cover"
                />
                <p className="text-xs text-muted">
                  {campos.imagen.textoAlternativo
                    ? `Texto alternativo: ${campos.imagen.textoAlternativo}`
                    : 'Esta imagen no tiene texto alternativo.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin imagen.</p>
            )}
            {errores.imagen && <p className="text-sm text-redParish">{errores.imagen}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEligiendoImagen(true)}
                className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                {campos.imagen ? 'Cambiar imagen' : 'Elegir imagen'}
              </button>
              {campos.imagen && (
                <button
                  type="button"
                  onClick={() => cambiar({ imagen: null })}
                  className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Quitar imagen
                </button>
              )}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borderSoft pt-5">
        <button
          type="submit"
          disabled={guardar.isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardar.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {editando ? 'Guardar cambios' : 'Crear evento'}
        </button>
        <Link
          to="/admin/eventos"
          className="rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          Cancelar
        </Link>
      </div>

      {eligiendoImagen && (
        <SelectorImagenes
          titulo="Imagen del evento"
          onSeleccionar={(imagen) => {
            cambiar({ imagen });
            setEligiendoImagen(false);
          }}
          onCerrar={() => setEligiendoImagen(false)}
        />
      )}
    </form>
  );
}
