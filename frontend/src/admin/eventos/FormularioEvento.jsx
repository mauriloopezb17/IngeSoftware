import { useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ImagePlus, Save, Trash2 } from 'lucide-react';

import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { CLAVE_CATALOGOS, obtenerCatalogos } from '../publicaciones/api.js';
import {
  Aviso,
  Boton,
  CampoArea,
  CampoCasilla,
  CampoSelect,
  CampoTexto,
  useToast,
} from '../ui/index.js';
import { actualizarEvento, CLAVE_EVENTOS, crearEvento, ESTADOS_EVENTO } from './api.js';
import { CAMPO_DE_ERROR, camposDe, cuerpoDe, MAX_DESCRIPCION, MAX_LUGAR, validarLocal } from './campos.js';

const estiloControl =
  'w-full min-h-11 rounded-md border bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink';

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
            className={`${estiloControl} ${error ? 'border-danger' : 'border-sand'}`}
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
              className={`${estiloControl} ${error ? 'border-danger' : 'border-sand'}`}
            />
          </div>
        )}
      </div>
      <p id={`${id}-ayuda`} className="text-xs text-muted">
        {ayuda}
      </p>
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}

// Formulario de un evento del calendario (admin.md §4). `evento` (opcional): el que se edita.
export default function FormularioEvento({ evento }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const toast = useToast();
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
      const mensaje = editando
        ? `Se guardaron los cambios de «${guardado.titulo}».`
        : `Se creó el evento «${guardado.titulo}».`;
      toast.exito(mensaje);
      navegar('/admin/eventos', { state: { aviso: mensaje } });
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

  const mensajes = resumenDeErrores(errores, generales);

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-6 rounded-lg border border-sand bg-white p-5 sm:p-6">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajes.length > 0 && (
          <Aviso tipo="error" titulo="No se pudo guardar. Revisa lo siguiente:">
            <ul className="mt-1 list-disc pl-5">
              {mensajes.map((mensaje, i) => (
                <li key={`${i}-${mensaje}`}>{mensaje}</li>
              ))}
            </ul>
          </Aviso>
        )}
      </div>

      {/* Formulario en 1 columna cómoda dentro de max-w-3xl */}
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

        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>

        <CampoCasilla
          etiqueta="Todo el día"
          checked={campos.todoElDia}
          onChange={(e) => cambiar({ todoElDia: e.target.checked })}
        />

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
          mostrarContador
          ayuda="Texto plano."
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink">Imagen (opcional)</legend>
          {campos.imagen ? (
            <div className="flex flex-col gap-2 rounded-md border border-sand bg-panel p-3 sm:flex-row sm:items-center sm:gap-4">
              <img
                src={campos.imagen.url}
                alt={campos.imagen.textoAlternativo ?? ''}
                className="aspect-video w-full rounded object-cover sm:w-48 sm:shrink-0"
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
          {errores.imagen && (
            <p className="flex items-start gap-1.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>{errores.imagen}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Boton variante="secundario" tamano="sm" icono={ImagePlus} onClick={() => setEligiendoImagen(true)}>
              {campos.imagen ? 'Cambiar imagen' : 'Elegir imagen'}
            </Boton>
            {campos.imagen && (
              <Boton variante="secundario" tamano="sm" icono={Trash2} onClick={() => cambiar({ imagen: null })}>
                Quitar imagen
              </Boton>
            )}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-5">
        <Boton type="submit" variante="primario" icono={Save} cargando={guardar.isPending}>
          {editando ? 'Guardar cambios' : 'Crear evento'}
        </Boton>
        <Boton como={Link} to="/admin/eventos" variante="secundario">
          Cancelar
        </Boton>
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
