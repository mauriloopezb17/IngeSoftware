import { lazy, Suspense, useContext, useEffect, useId, useRef, useState } from 'react';
import { Link, UNSAFE_DataRouterContext, useBlocker, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { usePermisos } from '../permisos/usePermisos.js';
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
import {
  actualizarDetalleEvento,
  actualizarEvento,
  CLAVE_EVENTOS,
  crearEvento,
  ESTADOS_EVENTO,
} from './api.js';
import {
  CAMPO_DE_ERROR,
  camposDe,
  cuerpoDe,
  detalleDe,
  MAX_ACTIVIDAD,
  MAX_DESCRIPCION,
  MAX_DIRECCION,
  MAX_ENLACE_TEXTO,
  MAX_ENLACE_URL,
  MAX_ENLACES,
  MAX_LUGAR,
  MAX_MAPA,
  MAX_PROGRAMA,
  MAX_RESPONSABLE_NOMBRE,
  MAX_RESPONSABLE_ROL,
  validarLocal,
} from './campos.js';
import PreviaEvento from './PreviaEvento.jsx';

// BlockNote es pesado: el editor se carga de forma diferida solo al abrir el formulario.
const EditorContenido = lazy(() => import('../publicaciones/editor/EditorContenido.jsx'));

const estiloControl =
  'w-full min-h-11 rounded-md border bg-white px-3 py-2 text-sm text-ink transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-panel disabled:text-muted';

const huella = (campos) =>
  JSON.stringify({ ...campos, imagen: campos.imagen?.id ?? null });

function BloqueadorNavegacion({ activoRef, omitirRef }) {
  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !omitirRef.current && activoRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  if (bloqueo.state !== 'blocked') return null;

  return (
    <Dialogo titulo="Hay cambios sin guardar" onCerrar={() => bloqueo.reset()} ancho="max-w-md">
      <p className="text-sm text-ink">Si sales de esta pantalla ahora, perderás los cambios que no guardaste.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Boton variante="primario" onClick={() => bloqueo.reset()}>
          Seguir editando
        </Boton>
        <Boton variante="peligro" onClick={() => bloqueo.proceed()}>
          Salir sin guardar
        </Boton>
      </div>
    </Dialogo>
  );
}

// Día y hora de un extremo del evento. Con «todo el día» solo se pide el día.
function DiaYHora({ legend, ayuda, error, dia, hora, conHora, onCambiar, obligatorio, disabled }) {
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
            disabled={disabled}
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
              disabled={disabled}
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

function MensajeErrorGrupo({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-danger">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

// Formulario de un evento del calendario (admin.md §4). `evento` (opcional): el que se edita.
export default function FormularioEvento({ evento }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const avisos = useRef(null);
  const { puede } = usePermisos();

  const editando = Boolean(evento);
  const puedeGestionar = puede('eventos.gestionar');
  const soloDetalle = editando && !puedeGestionar;
  const conDataRouter = Boolean(useContext(UNSAFE_DataRouterContext));

  const [campos, setCampos] = useState(() => camposDe(evento));
  const [base] = useState(() => huella(camposDe(evento)));
  const [bloquesBase, setBloquesBase] = useState(null);
  const [bloques, setBloques] = useState(null);
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [eligiendoImagen, setEligiendoImagen] = useState(false);
  const [verPrevia, setVerPrevia] = useState(false);

  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  const catalogos = useQuery({ queryKey: CLAVE_CATALOGOS, queryFn: obtenerCatalogos, staleTime: 5 * 60 * 1000 });
  const categorias = catalogos.data?.categoriasEvento ?? [];

  const hayCambios =
    huella(campos) !== base ||
    (bloquesBase !== null && bloques !== null && JSON.stringify(bloques) !== bloquesBase);
  const hayCambiosRef = useRef(false);
  const omitirAvisoRef = useRef(false);
  useEffect(() => {
    hayCambiosRef.current = hayCambios;
  }, [hayCambios]);

  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (e) => e.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  function mostrarErrores(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const bloquesActuales = () => bloques ?? (bloquesBase ? JSON.parse(bloquesBase) : evento?.detalle?.contenido?.bloques ?? []);

  const guardar = useMutation({
    mutationFn: () => {
      const listaBloques = bloquesActuales();
      if (soloDetalle) return actualizarDetalleEvento(evento.id, detalleDe(campos, listaBloques));
      const cuerpo = cuerpoDe(campos, listaBloques);
      return editando ? actualizarEvento(evento.id, cuerpo) : crearEvento(cuerpo);
    },
    onSuccess: (guardado) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_EVENTOS });
      omitirAvisoRef.current = true;
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
    const locales = validarLocal(campos, { soloDetalle });
    if (Object.keys(locales).length) {
      mostrarErrores(locales);
      return;
    }
    guardar.mutate();
  }

  function agregarActividad() {
    if (campos.programa.length >= MAX_PROGRAMA) return;
    cambiar({ programa: [...campos.programa, { hora: '', actividad: '' }] });
  }

  function actualizarActividad(indice, cambios) {
    cambiar({
      programa: campos.programa.map((item, i) => (i === indice ? { ...item, ...cambios } : item)),
    });
  }

  function moverActividad(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= campos.programa.length) return;
    const copia = [...campos.programa];
    const [movido] = copia.splice(indice, 1);
    copia.splice(destino, 0, movido);
    cambiar({ programa: copia });
  }

  function quitarActividad(indice) {
    cambiar({ programa: campos.programa.filter((_, i) => i !== indice) });
  }

  function agregarEnlace() {
    if (campos.enlaces.length >= MAX_ENLACES) return;
    cambiar({ enlaces: [...campos.enlaces, { texto: '', url: '' }] });
  }

  function actualizarEnlace(indice, cambios) {
    cambiar({
      enlaces: campos.enlaces.map((item, i) => (i === indice ? { ...item, ...cambios } : item)),
    });
  }

  function quitarEnlace(indice) {
    cambiar({ enlaces: campos.enlaces.filter((_, i) => i !== indice) });
  }

  const mensajes = resumenDeErrores(errores, generales);
  const estaPublicadoYGuardado = editando && evento.estado?.codigo === 'PUBLICADO' && !hayCambios;
  const publicadoUrl = editando && evento.estado?.codigo === 'PUBLICADO' ? `/calendario/${evento.id}` : null;

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-6">
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

      {/* Bloque 1: Tarjeta del calendario */}
      <section aria-labelledby="titulo-tarjeta-evento" className="flex flex-col gap-6 rounded-lg border border-sand bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sand pb-3">
          <div>
            <h2 id="titulo-tarjeta-evento" className="text-lg font-semibold text-ink">
              Tarjeta del calendario
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Datos que aparecen en la agenda de la portada y en las tarjetas del calendario.
            </p>
          </div>
          {soloDetalle && (
            <span className="rounded bg-panel px-2.5 py-1 text-xs font-medium text-muted">
              Solo lectura · gestionado por secretaría
            </span>
          )}
        </div>

        <CampoTexto
          etiqueta="Título"
          value={campos.titulo}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          error={errores.titulo}
          maxLength={200}
          required
          disabled={soloDetalle}
          autoComplete="off"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Categoría"
            value={campos.categoriaId}
            onChange={(e) => cambiar({ categoriaId: e.target.value })}
            error={errores.categoria ?? (catalogos.isError ? 'No se pudieron cargar las categorías.' : undefined)}
            disabled={soloDetalle || catalogos.isPending}
            required
            opciones={[['', 'Elige una categoría'], ...categorias.map((c) => [String(c.id), c.nombre])]}
          />

          <CampoSelect
            etiqueta="Estado"
            value={campos.estado}
            onChange={(e) => cambiar({ estado: e.target.value })}
            error={errores.estado}
            disabled={soloDetalle}
            ayuda="Los eventos se publican directamente, sin revisión. Un borrador no se ve en el portal."
            opciones={Object.entries(ESTADOS_EVENTO)}
          />
        </div>

        <CampoCasilla
          etiqueta="Todo el día"
          checked={campos.todoElDia}
          disabled={soloDetalle}
          onChange={(e) => cambiar({ todoElDia: e.target.checked })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <DiaYHora
            legend="Inicio"
            ayuda="Hora de Bolivia."
            obligatorio
            disabled={soloDetalle}
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
            disabled={soloDetalle}
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
          disabled={soloDetalle}
          autoComplete="off"
        />

        <CampoArea
          etiqueta="Resumen para la tarjeta del calendario"
          value={campos.descripcion}
          onChange={(e) => cambiar({ descripcion: e.target.value })}
          error={errores.descripcion}
          maxLength={MAX_DESCRIPCION}
          disabled={soloDetalle}
          mostrarContador
          ayuda="Texto plano breve (opcional)."
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
          {!soloDetalle && (
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
          )}
        </fieldset>
      </section>

      {/* Bloque 2: Página del evento */}
      <section aria-labelledby="titulo-pagina-evento" className="flex flex-col gap-6 rounded-lg border border-sand bg-white p-5 sm:p-6">
        <div className="border-b border-sand pb-3">
          <h2 id="titulo-pagina-evento" className="text-lg font-semibold text-ink">
            Página del evento
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Lo que completes aquí aparece al abrir el evento en el portal. Todo es opcional.
          </p>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-semibold text-ink">Contenido</legend>
          <p className="text-xs text-muted">
            Descripción ampliada con texto, listas, citas, fotos y videos de la biblioteca.
          </p>
          <Suspense
            fallback={
              <p role="status" className="flex items-center gap-2 rounded-md border border-sand bg-panel px-3 py-6 text-sm text-muted">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando el editor…
              </p>
            }
          >
            <EditorContenido
              etiqueta="Contenido de la página del evento"
              valorInicial={evento?.detalle?.contenido}
              alIniciar={(documento) => {
                setBloquesBase(JSON.stringify(documento));
                setBloques(documento);
              }}
              alCambiar={setBloques}
            />
          </Suspense>
          <MensajeErrorGrupo id="error-contenido-evento" error={errores.contenido} />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Dirección"
            value={campos.direccion}
            onChange={(e) => cambiar({ direccion: e.target.value })}
            error={errores.direccion}
            maxLength={MAX_DIRECCION}
            ayuda="Dirección exacta o referencia para llegar."
            autoComplete="off"
          />

          <CampoTexto
            etiqueta="Enlace de Google Maps"
            type="url"
            value={campos.enlaceMapa}
            onChange={(e) => cambiar({ enlaceMapa: e.target.value })}
            error={errores.enlaceMapa}
            maxLength={MAX_MAPA}
            ayuda="En Google Maps, abre el lugar, pulsa «Compartir» y copia el enlace (https://maps.app.goo.gl/… o https://www.google.com/maps/…)."
            autoComplete="off"
          />
        </div>

        {/* Programa */}
        <fieldset className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <legend className="text-sm font-semibold text-ink">Programa</legend>
              <p className="text-xs text-muted">
                Horarios del evento (máx. {MAX_PROGRAMA}). Se ordenan por hora al guardar.
              </p>
            </div>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={Plus}
              onClick={agregarActividad}
              disabled={campos.programa.length >= MAX_PROGRAMA}
            >
              Agregar actividad
            </Boton>
          </div>

          {campos.programa.length > 0 && (
            <ul aria-label="Programa del evento" className="flex flex-col gap-2">
              {campos.programa.map((item, indice) => (
                <li
                  key={indice}
                  className="flex flex-col gap-2 rounded-md border border-sand bg-panel p-3 sm:flex-row sm:items-end"
                >
                  <div className="flex flex-col gap-1 sm:w-32">
                    <label htmlFor={`programa-hora-${indice}`} className="text-xs font-semibold text-muted">
                      Hora {indice + 1}
                    </label>
                    <input
                      id={`programa-hora-${indice}`}
                      type="time"
                      value={item.hora}
                      onChange={(e) => actualizarActividad(indice, { hora: e.target.value })}
                      className={`${estiloControl} border-sand`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor={`programa-actividad-${indice}`} className="text-xs font-semibold text-muted">
                      Actividad {indice + 1}
                    </label>
                    <input
                      id={`programa-actividad-${indice}`}
                      type="text"
                      value={item.actividad}
                      maxLength={MAX_ACTIVIDAD}
                      placeholder="Ej. Misa solemne de apertura"
                      onChange={(e) => actualizarActividad(indice, { actividad: e.target.value })}
                      className={`${estiloControl} border-sand`}
                    />
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={ArrowUp}
                      onClick={() => moverActividad(indice, -1)}
                      disabled={indice === 0}
                      aria-label={`Subir actividad ${indice + 1}`}
                    />
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={ArrowDown}
                      onClick={() => moverActividad(indice, 1)}
                      disabled={indice === campos.programa.length - 1}
                      aria-label={`Bajar actividad ${indice + 1}`}
                    />
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      icono={Trash2}
                      onClick={() => quitarActividad(indice)}
                      aria-label={`Quitar actividad ${indice + 1}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <MensajeErrorGrupo id="error-programa-evento" error={errores.programa} />
        </fieldset>

        {/* Responsable y contacto */}
        <fieldset className="flex flex-col gap-3 rounded-md border border-sand bg-panel p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Responsable y contacto</legend>
          <p className="text-xs text-muted">
            Contacto público de quien organiza o coordina el evento.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Nombre del responsable"
              value={campos.responsableNombre}
              onChange={(e) => cambiar({ responsableNombre: e.target.value })}
              error={errores.responsableNombre}
              maxLength={MAX_RESPONSABLE_NOMBRE}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Rol o cargo (opcional)"
              value={campos.responsableRol}
              onChange={(e) => cambiar({ responsableRol: e.target.value })}
              error={errores.responsableRol}
              maxLength={MAX_RESPONSABLE_ROL}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Teléfono (opcional)"
              type="tel"
              value={campos.responsableTelefono}
              onChange={(e) => cambiar({ responsableTelefono: e.target.value })}
              error={errores.responsableTelefono}
              maxLength={30}
              autoComplete="off"
            />
            <CampoTexto
              etiqueta="Correo electrónico (opcional)"
              type="email"
              value={campos.responsableCorreo}
              onChange={(e) => cambiar({ responsableCorreo: e.target.value })}
              error={errores.responsableCorreo}
              maxLength={120}
              autoComplete="off"
            />
          </div>
        </fieldset>

        {/* Enlaces */}
        <fieldset className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <legend className="text-sm font-semibold text-ink">Enlaces</legend>
              <p className="text-xs text-muted">
                Formularios de inscripción, documentos externos o páginas relacionadas (máx. {MAX_ENLACES}).
              </p>
            </div>
            <Boton
              variante="secundario"
              tamano="sm"
              icono={Plus}
              onClick={agregarEnlace}
              disabled={campos.enlaces.length >= MAX_ENLACES}
            >
              Agregar enlace
            </Boton>
          </div>

          {campos.enlaces.length > 0 && (
            <ul aria-label="Enlaces del evento" className="flex flex-col gap-2">
              {campos.enlaces.map((item, indice) => (
                <li
                  key={indice}
                  className="flex flex-col gap-2 rounded-md border border-sand bg-panel p-3 sm:flex-row sm:items-end"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor={`enlace-texto-${indice}`} className="text-xs font-semibold text-muted">
                      Texto del enlace {indice + 1}
                    </label>
                    <input
                      id={`enlace-texto-${indice}`}
                      type="text"
                      value={item.texto}
                      maxLength={MAX_ENLACE_TEXTO}
                      placeholder="Ej. Formulario de inscripción"
                      onChange={(e) => actualizarEnlace(indice, { texto: e.target.value })}
                      className={`${estiloControl} border-sand`}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor={`enlace-url-${indice}`} className="text-xs font-semibold text-muted">
                      URL {indice + 1}
                    </label>
                    <input
                      id={`enlace-url-${indice}`}
                      type="url"
                      value={item.url}
                      maxLength={MAX_ENLACE_URL}
                      placeholder="https://..."
                      onChange={(e) => actualizarEnlace(indice, { url: e.target.value })}
                      className={`${estiloControl} border-sand`}
                    />
                  </div>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={Trash2}
                    onClick={() => quitarEnlace(indice)}
                    aria-label={`Quitar enlace ${indice + 1}`}
                  />
                </li>
              ))}
            </ul>
          )}
          <MensajeErrorGrupo id="error-enlaces-evento" error={errores.enlaces} />
        </fieldset>
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sand bg-white p-5 sm:p-6">
        <Boton type="submit" variante="primario" icono={Save} cargando={guardar.isPending}>
          {soloDetalle ? 'Guardar página del evento' : editando ? 'Guardar cambios' : 'Crear evento'}
        </Boton>

        {estaPublicadoYGuardado ? (
          <Boton
            como="a"
            href={publicadoUrl}
            target="_blank"
            rel="noopener noreferrer"
            variante="secundario"
            icono={ExternalLink}
          >
            Ver cómo queda
          </Boton>
        ) : (
          <Boton variante="secundario" icono={Eye} onClick={() => setVerPrevia(true)}>
            Ver cómo queda
          </Boton>
        )}

        <Boton como={Link} to="/admin/eventos" variante="secundario">
          Cancelar
        </Boton>

        {hayCambios && <p className="text-sm text-muted">Hay cambios sin guardar.</p>}
      </div>

      {verPrevia && (
        <PreviaEvento
          campos={campos}
          categoria={categorias.find((c) => String(c.id) === campos.categoriaId)}
          bloques={bloquesActuales()}
          publicadoUrl={publicadoUrl}
          onCerrar={() => setVerPrevia(false)}
        />
      )}

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

      {conDataRouter && <BloqueadorNavegacion activoRef={hayCambiosRef} omitirRef={omitirAvisoRef} />}
    </form>
  );
}
