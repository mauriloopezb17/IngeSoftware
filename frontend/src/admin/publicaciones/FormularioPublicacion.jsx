import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, ImagePlus, Loader2, Rocket, Save, Send, Trash2 } from 'lucide-react';

import CampoTexto from '../componentes/CampoTexto.jsx';
import Dialogo from '../componentes/Dialogo.jsx';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import {
  actualizarPublicacion,
  CLAVE_CATALOGOS,
  CLAVE_PUBLICACIONES,
  crearPublicacion,
  enviarARevision,
  obtenerCatalogos,
  publicarPublicacion,
  TIPO_AVISO,
  TIPOS_DE_ESTA_PANTALLA,
} from './api.js';
import { aContenido } from './contenido.js';
import { aCampoFecha, deCampoFecha } from './fechas.js';
import PreviaPublicacion from './PreviaPublicacion.jsx';

// BlockNote es pesado: el editor se descarga solo cuando se abre este formulario.
const EditorContenido = lazy(() => import('./editor/EditorContenido.jsx'));

const estiloControl =
  'w-full rounded-md border bg-white px-3 py-2.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-goldDark disabled:bg-stone';

const MAX_RESUMEN = 400;

// Campos del formulario a partir de una publicación de la API (o vacíos, para una nueva).
function camposDe(publicacion, tipoInicial = 'NOTICIA') {
  return {
    titulo: publicacion?.titulo ?? '',
    resumen: publicacion?.resumen ?? '',
    tipo: publicacion?.tipo.codigo ?? tipoInicial,
    categoriaId: publicacion?.categoria ? String(publicacion.categoria.id) : '',
    portada: publicacion?.imagenPortada ?? null,
    destacada: publicacion?.destacada ?? false,
    fechaPublicacion: aCampoFecha(publicacion?.fechaPublicacion),
    fechaExpiracion: aCampoFecha(publicacion?.fechaExpiracion),
    urlExterna: publicacion?.urlExterna ?? '',
  };
}

// Lo que cuenta para saber si hay cambios sin guardar.
const huella = (campos) => JSON.stringify({ ...campos, portada: campos.portada?.id ?? null });

// El campo del detalle de un error 400 -> el campo del formulario que lo muestra.
const CAMPO_DE_ERROR = {
  titulo: 'titulo',
  resumen: 'resumen',
  categoriaId: 'categoriaId',
  imagenPortadaId: 'portada',
  urlExterna: 'urlExterna',
  fechaPublicacion: 'fechaPublicacion',
  fechaExpiracion: 'fechaExpiracion',
  contenido: 'contenido',
  'contenido.bloques': 'contenido',
};

function erroresDe(error) {
  const errores = {};
  const generales = [];
  for (const { campo, mensaje } of error.detalles ?? []) {
    const destino = CAMPO_DE_ERROR[campo];
    if (destino && !errores[destino]) errores[destino] = mensaje;
    else generales.push(mensaje);
  }
  // Un error sin detalle por campo (403, 409...) se muestra como aviso general.
  if (!Object.keys(errores).length && !generales.length) generales.push(error.message);
  return { errores, generales };
}

function validarLocal(campos) {
  const errores = {};
  const titulo = campos.titulo.trim();
  if (titulo.length < 3 || titulo.length > 200) errores.titulo = 'El título debe tener entre 3 y 200 caracteres.';
  if (campos.urlExterna && !/^https:\/\/\S+$/.test(campos.urlExterna))
    errores.urlExterna = 'Debe ser una URL que empiece con https://.';
  if (
    campos.fechaPublicacion &&
    campos.fechaExpiracion &&
    campos.fechaExpiracion <= campos.fechaPublicacion
  )
    errores.fechaExpiracion = 'La expiración debe ser posterior a la fecha de publicación.';
  return errores;
}

function Grupo({ legend, error, children, ayuda }) {
  const id = useId();
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined} className="flex flex-col gap-1.5">
      <legend className="text-sm font-semibold text-ink">{legend}</legend>
      {children}
      {ayuda && <p className="text-xs text-muted">{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-redParish">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// Formulario de noticia, nota de prensa o aviso. `publicacion` (opcional): la que se edita.
// `tipoInicial`: el tipo de una publicación nueva (los avisos pasan 'AVISO'; el tipo no se puede cambiar después).
// `aviso`: mensaje inicial (por ejemplo, «Borrador guardado.» al venir de crear).
export default function FormularioPublicacion({ publicacion, tipoInicial = 'NOTICIA', aviso: avisoInicial = '' }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const idResumen = useId();
  const idCategoria = useId();
  const idFechaPublicacion = useId();
  const idFechaExpiracion = useId();
  const idDestacada = useId();
  const idTipo = useId();
  const avisos = useRef(null);

  const [campos, setCampos] = useState(() => camposDe(publicacion, tipoInicial));
  const [base, setBase] = useState(() => huella(camposDe(publicacion, tipoInicial)));
  // Documento del editor: `bloquesBase` es como quedó cargado (BlockNote lo normaliza) y `bloques` el actual.
  const [bloquesBase, setBloquesBase] = useState(null);
  const [bloques, setBloques] = useState(null);

  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);
  const [aviso, setAviso] = useState(avisoInicial);
  const [eligiendoPortada, setEligiendoPortada] = useState(false);
  const [verPrevia, setVerPrevia] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);

  const editando = Boolean(publicacion);
  const esAviso = campos.tipo === TIPO_AVISO;
  const listadoVolver = esAviso ? '/admin/publicaciones/avisos' : '/admin/publicaciones';
  const cambiar = (cambios) => setCampos((actuales) => ({ ...actuales, ...cambios }));

  const catalogos = useQuery({ queryKey: CLAVE_CATALOGOS, queryFn: obtenerCatalogos, staleTime: 5 * 60 * 1000 });
  const categorias = catalogos.data?.categorias ?? [];

  // ---- Cambios sin guardar ----
  const hayCambios =
    huella(campos) !== base || (bloquesBase !== null && bloques !== null && JSON.stringify(bloques) !== bloquesBase);
  const hayCambiosRef = useRef(false);
  const omitirAvisoRef = useRef(false);
  useEffect(() => {
    hayCambiosRef.current = hayCambios;
  }, [hayCambios]);

  const bloqueo = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !omitirAvisoRef.current && hayCambiosRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  // Cerrar o recargar la pestaña también pide confirmación.
  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (evento) => evento.preventDefault();
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  // ---- Guardar ----
  const guardar = useMutation({
    mutationFn: (cuerpo) => (editando ? actualizarPublicacion(publicacion.id, cuerpo) : crearPublicacion(cuerpo)),
    onSuccess: (guardada) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      setErrores({});
      setGenerales([]);
      if (!editando) {
        omitirAvisoRef.current = true;
        navegar(`/admin/publicaciones/${guardada.id}/editar`, { replace: true, state: { aviso: 'Borrador guardado.' } });
        return;
      }
      const guardados = camposDe(guardada);
      setBase(huella(guardados));
      setBloquesBase(JSON.stringify(bloques ?? bloquesBase ?? []));
      setAviso('Cambios guardados.');
    },
    onError: (error) => {
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
    },
  });

  const construirCuerpo = () => ({
    titulo: campos.titulo.trim(),
    resumen: campos.resumen.trim() || null,
    categoriaId: campos.categoriaId ? Number(campos.categoriaId) : null,
    imagenPortadaId: campos.portada?.id ?? null,
    contenido: aContenido(bloques ?? JSON.parse(bloquesBase ?? '[]')),
    urlExterna: campos.urlExterna.trim() || null,
    destacada: campos.destacada,
    fechaPublicacion: deCampoFecha(campos.fechaPublicacion),
    fechaExpiracion: deCampoFecha(campos.fechaExpiracion),
  });

  // ---- Publicar directamente (avisos: sin revisión) ----
  // Guarda lo que haya en pantalla y publica. Con una fecha de publicación futura queda programada.
  // Si el aviso se llegó a crear pero no se pudo publicar, queda como borrador y se lleva a su edición
  // (no se reintenta desde «nuevo», para no duplicarlo).
  const publicar = useMutation({
    mutationFn: async () => {
      const cuerpo = construirCuerpo();
      let id = publicacion?.id;
      try {
        if (editando) await actualizarPublicacion(id, cuerpo);
        else id = (await crearPublicacion({ tipo: campos.tipo, ...cuerpo })).id;
      } catch (error) {
        error.creadaId = null;
        throw error;
      }
      const fechas = {};
      if (cuerpo.fechaPublicacion) fechas.fechaPublicacion = cuerpo.fechaPublicacion;
      if (cuerpo.fechaExpiracion) fechas.fechaExpiracion = cuerpo.fechaExpiracion;
      try {
        return await publicarPublicacion(id, fechas);
      } catch (error) {
        error.creadaId = editando ? null : id;
        throw error;
      }
    },
    onSuccess: (publicada) => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      omitirAvisoRef.current = true;
      const programada = publicada.fechaPublicacion && new Date(publicada.fechaPublicacion) > new Date();
      navegar(listadoVolver, {
        state: { aviso: `«${publicada.titulo}» ${programada ? 'quedó programada' : 'se publicó'}.` },
      });
    },
    onError: (error) => {
      if (error.creadaId) {
        clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
        omitirAvisoRef.current = true;
        navegar(`/admin/publicaciones/${error.creadaId}/editar`, {
          replace: true,
          state: { aviso: `Se guardó como borrador, pero no se pudo publicar: ${error.message}` },
        });
        return;
      }
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
    },
  });

  function publicarAviso() {
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      setErrores(locales);
      setGenerales([]);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
      return;
    }
    publicar.mutate();
  }

  // ---- Enviar a revisión (Marketing) ----
  // Guarda primero lo que haya en pantalla, para que el Párroco revise exactamente eso, y luego envía.
  const enviarRevision = useMutation({
    mutationFn: async (cuerpo) => {
      if (cuerpo) await actualizarPublicacion(publicacion.id, cuerpo);
      return enviarARevision(publicacion.id);
    },
    onSuccess: () => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      omitirAvisoRef.current = true;
      navegar('/admin/publicaciones', { state: { aviso: `«${campos.titulo.trim()}» se envió a revisión.` } });
    },
    onError: (error) => {
      setConfirmandoEnvio(false);
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
    },
  });

  function confirmarEnvio() {
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      setErrores(locales);
      setGenerales([]);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
      return;
    }
    setConfirmandoEnvio(true);
  }

  function enviar(evento) {
    evento.preventDefault();
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      setErrores(locales);
      setGenerales([]);
      setAviso('');
      requestAnimationFrame(() => avisos.current?.focus());
      return;
    }

    const cuerpo = construirCuerpo();
    // El tipo se elige al crear y no se puede cambiar después.
    guardar.mutate(editando ? cuerpo : { tipo: campos.tipo, ...cuerpo });
  }

  const puedeEnviar = editando && publicacion.acciones.includes('ENVIAR_REVISION');
  const puedePublicar = esAviso && (!editando || publicacion.acciones.includes('PUBLICAR'));
  const mensajesDeError = [...Object.values(errores), ...generales];

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-6">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajesDeError.length > 0 && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-redParish/30 bg-redParish/5 p-4 text-sm text-redParish">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">No se pudo guardar. Revisa lo siguiente:</p>
              <ul className="mt-1 list-disc pl-5">
                {mensajesDeError.map((mensaje) => (
                  <li key={mensaje}>{mensaje}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {aviso && !mensajesDeError.length && (
          <p role="status" className="rounded-md bg-goldPale px-3 py-2 text-sm text-goldDark">
            {aviso}
          </p>
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor={idResumen} className="text-sm font-semibold text-ink">
              Resumen
            </label>
            <textarea
              id={idResumen}
              value={campos.resumen}
              onChange={(e) => cambiar({ resumen: e.target.value })}
              maxLength={MAX_RESUMEN}
              rows={3}
              aria-invalid={errores.resumen ? 'true' : undefined}
              className={`${estiloControl} ${errores.resumen ? 'border-redParish' : 'border-borderSoft'}`}
            />
            <p className="text-xs text-muted">
              Se muestra en las tarjetas del portal. {campos.resumen.length}/{MAX_RESUMEN}
            </p>
            {errores.resumen && <p className="text-sm text-redParish">{errores.resumen}</p>}
          </div>

          <Grupo legend="Contenido" error={errores.contenido}>
            <Suspense
              fallback={
                <p role="status" className="flex items-center gap-2 rounded-md border border-borderSoft bg-white px-3 py-6 text-sm text-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando el editor…
                </p>
              }
            >
              <EditorContenido
                valorInicial={publicacion?.contenido}
                alIniciar={(documento) => {
                  setBloquesBase(JSON.stringify(documento));
                  setBloques(documento);
                }}
                alCambiar={setBloques}
              />
            </Suspense>
          </Grupo>

          <CampoTexto
            etiqueta="Enlace externo (opcional)"
            type="url"
            value={campos.urlExterna}
            onChange={(e) => cambiar({ urlExterna: e.target.value })}
            error={errores.urlExterna}
            ayuda="Para una nota publicada en otro medio. Debe empezar con https://"
            maxLength={500}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idTipo} className="text-sm font-semibold text-ink">
              Tipo
            </label>
            <select
              id={idTipo}
              value={campos.tipo}
              onChange={(e) => cambiar({ tipo: e.target.value })}
              disabled={editando || esAviso}
              className={`${estiloControl} border-borderSoft`}
            >
              {Object.entries(esAviso ? { [TIPO_AVISO]: 'Aviso' } : TIPOS_DE_ESTA_PANTALLA).map(([codigo, nombre]) => (
                <option key={codigo} value={codigo}>
                  {nombre}
                </option>
              ))}
            </select>
            {(editando || esAviso) && <p className="text-xs text-muted">El tipo no se puede cambiar.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={idCategoria} className="text-sm font-semibold text-ink">
              Categoría
            </label>
            <select
              id={idCategoria}
              value={campos.categoriaId}
              onChange={(e) => cambiar({ categoriaId: e.target.value })}
              disabled={catalogos.isPending}
              aria-invalid={errores.categoriaId ? 'true' : undefined}
              className={`${estiloControl} ${errores.categoriaId ? 'border-redParish' : 'border-borderSoft'}`}
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
            {catalogos.isError && <p className="text-xs text-redParish">No se pudieron cargar las categorías.</p>}
            {errores.categoriaId && <p className="text-sm text-redParish">{errores.categoriaId}</p>}
          </div>

          <Grupo legend="Imagen de portada" error={errores.portada}>
            {campos.portada ? (
              <div className="flex flex-col gap-2 rounded-md border border-borderSoft bg-white p-2">
                <img
                  src={campos.portada.url}
                  alt={campos.portada.textoAlternativo ?? ''}
                  className="aspect-video w-full rounded object-cover"
                />
                <p className="text-xs text-muted">
                  {campos.portada.textoAlternativo ? (
                    <>Texto alternativo: {campos.portada.textoAlternativo}</>
                  ) : (
                    'Esta imagen no tiene texto alternativo: hace falta para publicar.'
                  )}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin imagen de portada.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEligiendoPortada(true)}
                className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
              >
                <ImagePlus className="size-4" aria-hidden="true" />
                {campos.portada ? 'Cambiar imagen' : 'Elegir imagen'}
              </button>
              {campos.portada && (
                <button
                  type="button"
                  onClick={() => cambiar({ portada: null })}
                  className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
                >
                  <Trash2 className="size-4" aria-hidden="true" /> Quitar imagen
                </button>
              )}
            </div>
          </Grupo>

          <label htmlFor={idDestacada} className="flex items-center gap-2 text-sm font-medium">
            <input
              id={idDestacada}
              type="checkbox"
              checked={campos.destacada}
              onChange={(e) => cambiar({ destacada: e.target.checked })}
              className="size-4 accent-goldDark"
            />
            Destacada en el portal
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={idFechaPublicacion} className="text-sm font-semibold text-ink">
              Fecha de publicación
            </label>
            <input
              id={idFechaPublicacion}
              type="datetime-local"
              value={campos.fechaPublicacion}
              onChange={(e) => cambiar({ fechaPublicacion: e.target.value })}
              aria-invalid={errores.fechaPublicacion ? 'true' : undefined}
              className={`${estiloControl} ${errores.fechaPublicacion ? 'border-redParish' : 'border-borderSoft'}`}
            />
            <p className="text-xs text-muted">
              Fecha deseada (hora de Bolivia): se aplica al publicar o aprobar. Si es futura, queda programada.
            </p>
            {errores.fechaPublicacion && <p className="text-sm text-redParish">{errores.fechaPublicacion}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={idFechaExpiracion} className="text-sm font-semibold text-ink">
              Fecha de expiración (opcional)
            </label>
            <input
              id={idFechaExpiracion}
              type="datetime-local"
              value={campos.fechaExpiracion}
              onChange={(e) => cambiar({ fechaExpiracion: e.target.value })}
              aria-invalid={errores.fechaExpiracion ? 'true' : undefined}
              className={`${estiloControl} ${errores.fechaExpiracion ? 'border-redParish' : 'border-borderSoft'}`}
            />
            <p className="text-xs text-muted">Después de esta fecha deja de verse en el portal.</p>
            {errores.fechaExpiracion && <p className="text-sm text-redParish">{errores.fechaExpiracion}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-borderSoft pt-5">
        <button
          type="submit"
          disabled={guardar.isPending || publicar.isPending}
          className="flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guardar.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {editando ? 'Guardar cambios' : 'Guardar borrador'}
        </button>
        {puedePublicar && (
          <button
            type="button"
            onClick={publicarAviso}
            disabled={guardar.isPending || publicar.isPending}
            className="flex items-center gap-2 rounded-md border border-goldDark bg-white px-4 py-2.5 text-sm font-semibold text-goldDark hover:bg-goldPale focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publicar.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Rocket className="size-4" aria-hidden="true" />
            )}
            Publicar
          </button>
        )}
        {puedeEnviar && (
          <button
            type="button"
            onClick={confirmarEnvio}
            disabled={guardar.isPending || enviarRevision.isPending || publicar.isPending}
            className="flex items-center gap-2 rounded-md border border-goldDark bg-white px-4 py-2.5 text-sm font-semibold text-goldDark hover:bg-goldPale focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden="true" /> Enviar a revisión
          </button>
        )}
        <button
          type="button"
          onClick={() => setVerPrevia(true)}
          className="flex items-center gap-2 rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          <Eye className="size-4" aria-hidden="true" /> Vista previa
        </button>
        <Link
          to={listadoVolver}
          className="rounded-md border border-borderSoft bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          {esAviso ? 'Volver a avisos' : 'Volver a publicaciones'}
        </Link>
        {hayCambios && <p className="text-sm text-muted">Hay cambios sin guardar.</p>}
      </div>

      {confirmandoEnvio && (
        <Dialogo titulo="Enviar a revisión" onCerrar={() => setConfirmandoEnvio(false)} ancho="max-w-md">
          <p className="text-sm text-charcoal">
            El Párroco revisará la publicación y podrá aprobarla o rechazarla. Mientras esté en revisión no podrás editarla.
            {hayCambios && ' Se guardarán antes los cambios que tienes en pantalla.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmandoEnvio(false)}
              disabled={enviarRevision.isPending}
              className="rounded-md border border-borderSoft bg-white px-4 py-2 text-sm font-medium hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => enviarRevision.mutate(hayCambios ? construirCuerpo() : null)}
              disabled={enviarRevision.isPending}
              className="flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviarRevision.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Enviar a revisión
            </button>
          </div>
        </Dialogo>
      )}

      {verPrevia && (
        <PreviaPublicacion
          campos={campos}
          categoria={categorias.find((c) => String(c.id) === campos.categoriaId)}
          tipoNombre={esAviso ? 'Aviso' : TIPOS_DE_ESTA_PANTALLA[campos.tipo]}
          bloques={bloques ?? JSON.parse(bloquesBase ?? '[]')}
          onCerrar={() => setVerPrevia(false)}
        />
      )}

      {eligiendoPortada && (
        <SelectorImagenes
          titulo="Imagen de portada"
          exigirTextoAlternativo
          onSeleccionar={(imagen) => {
            cambiar({ portada: imagen });
            setEligiendoPortada(false);
          }}
          onCerrar={() => setEligiendoPortada(false)}
        />
      )}

      {bloqueo.state === 'blocked' && (
        <Dialogo titulo="Hay cambios sin guardar" onCerrar={() => bloqueo.reset()} ancho="max-w-md">
          <p className="text-sm text-charcoal">Si sales de esta pantalla ahora, perderás los cambios que no guardaste.</p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => bloqueo.reset()}
              className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => bloqueo.proceed()}
              className="rounded-md border border-redParish/40 bg-white px-4 py-2 text-sm font-medium text-redParish hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
            >
              Salir sin guardar
            </button>
          </div>
        </Dialogo>
      )}
    </form>
  );
}
