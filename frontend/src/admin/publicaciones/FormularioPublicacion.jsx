import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Eye, ImagePlus, Loader2, Rocket, Save, Send, Trash2 } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoSelect, CampoTexto, useToast } from '../ui/index.js';
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
    abrirEnlaceDirecto: Boolean(publicacion?.urlExterna && publicacion?.abrirEnlaceDirecto),
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
  abrirEnlaceDirecto: 'abrirEnlaceDirecto',
  fechaPublicacion: 'fechaPublicacion',
  fechaExpiracion: 'fechaExpiracion',
  contenido: 'contenido',
  'contenido.bloques': 'contenido',
};

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
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}

// Formulario de noticia, nota de prensa o aviso. `publicacion` (opcional): la que se edita.
// `tipoInicial`: el tipo de una publicación nueva (los avisos pasan 'AVISO'; el tipo no se puede cambiar después).
// `errorInicial`: error parcial tras guardar borrador (por ejemplo, si falló al publicar inmediatamente).
export default function FormularioPublicacion({ publicacion, tipoInicial = 'NOTICIA', errorInicial = '' }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const avisos = useRef(null);

  const [campos, setCampos] = useState(() => camposDe(publicacion, tipoInicial));
  const [base, setBase] = useState(() => huella(camposDe(publicacion, tipoInicial)));
  // Documento del editor: `bloquesBase` es como quedó cargado (BlockNote lo normaliza) y `bloques` el actual.
  const [bloquesBase, setBloquesBase] = useState(null);
  const [bloques, setBloques] = useState(null);

  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState(() => (errorInicial ? [errorInicial] : []));
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
        toast.exito('Borrador guardado.');
        navegar(`/admin/publicaciones/${guardada.id}/editar`, { replace: true, state: { aviso: 'Borrador guardado.' } });
        return;
      }
      const guardados = camposDe(guardada);
      setBase(huella(guardados));
      setBloquesBase(JSON.stringify(bloques ?? bloquesBase ?? []));
      toast.exito('Cambios guardados.');
    },
    onError: (error) => {
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error, CAMPO_DE_ERROR);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
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
    abrirEnlaceDirecto: Boolean(campos.urlExterna.trim()) && campos.abrirEnlaceDirecto,
    destacada: campos.destacada,
    fechaPublicacion: deCampoFecha(campos.fechaPublicacion),
    fechaExpiracion: deCampoFecha(campos.fechaExpiracion),
  });

  // ---- Publicar directamente (avisos: sin revisión) ----
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
      const mensaje = `«${publicada.titulo}» ${programada ? 'quedó programada' : 'se publicó'}.`;
      toast.exito(mensaje);
      navegar(listadoVolver, { state: { aviso: mensaje } });
    },
    onError: (error) => {
      if (error.creadaId) {
        clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
        omitirAvisoRef.current = true;
        const mensajeError = `Se guardó como borrador, pero no se pudo publicar: ${error.message}`;
        toast.error(mensajeError);
        navegar(`/admin/publicaciones/${error.creadaId}/editar`, {
          replace: true,
          state: { errorInicial: mensajeError },
        });
        return;
      }
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error, CAMPO_DE_ERROR);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
      requestAnimationFrame(() => avisos.current?.focus());
    },
  });

  function publicarAviso() {
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      setErrores(locales);
      setGenerales([]);
      requestAnimationFrame(() => avisos.current?.focus());
      return;
    }
    publicar.mutate();
  }

  // ---- Enviar a revisión (Marketing) ----
  const enviarRevision = useMutation({
    mutationFn: async (cuerpo) => {
      if (cuerpo) await actualizarPublicacion(publicacion.id, cuerpo);
      return enviarARevision(publicacion.id);
    },
    onSuccess: () => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PUBLICACIONES });
      omitirAvisoRef.current = true;
      const mensaje = `«${campos.titulo.trim()}» se envió a revisión.`;
      toast.exito(mensaje);
      navegar('/admin/publicaciones', { state: { aviso: mensaje } });
    },
    onError: (error) => {
      setConfirmandoEnvio(false);
      const { errores: porCampo, generales: avisosGenerales } = erroresDe(error, CAMPO_DE_ERROR);
      setErrores(porCampo);
      setGenerales(avisosGenerales);
      requestAnimationFrame(() => avisos.current?.focus());
    },
  });

  function confirmarEnvio() {
    const locales = validarLocal(campos);
    if (Object.keys(locales).length) {
      setErrores(locales);
      setGenerales([]);
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
      requestAnimationFrame(() => avisos.current?.focus());
      return;
    }

    const cuerpo = construirCuerpo();
    // El tipo se elige al crear y no se puede cambiar después.
    guardar.mutate(editando ? cuerpo : { tipo: campos.tipo, ...cuerpo });
  }

  const puedeEnviar = editando && publicacion.acciones.includes('ENVIAR_REVISION');
  const puedePublicar = esAviso && (!editando || publicacion.acciones.includes('PUBLICAR'));
  const mensajesDeError = resumenDeErrores(errores, generales);

  return (
    <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-6 rounded-lg border border-sand bg-white p-5 sm:p-6">
      <div ref={avisos} tabIndex={-1} className="outline-none">
        {mensajesDeError.length > 0 && (
          <Aviso tipo="error" titulo="No se pudo guardar. Revisa lo siguiente:">
            <ul className="mt-1 list-disc pl-5">
              {mensajesDeError.map((mensaje, i) => (
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
            etiqueta="Tipo"
            value={campos.tipo}
            onChange={(e) => cambiar({ tipo: e.target.value })}
            disabled={editando || esAviso}
            ayuda={editando || esAviso ? 'El tipo no se puede cambiar.' : undefined}
            opciones={Object.entries(esAviso ? { [TIPO_AVISO]: 'Aviso' } : TIPOS_DE_ESTA_PANTALLA)}
          />

          <CampoSelect
            etiqueta="Categoría"
            value={campos.categoriaId}
            onChange={(e) => cambiar({ categoriaId: e.target.value })}
            disabled={catalogos.isPending}
            error={errores.categoriaId ?? (catalogos.isError ? 'No se pudieron cargar las categorías.' : undefined)}
            opciones={[['', 'Sin categoría'], ...categorias.map((c) => [String(c.id), c.nombre])]}
          />
        </div>

        <CampoArea
          etiqueta="Resumen"
          value={campos.resumen}
          onChange={(e) => cambiar({ resumen: e.target.value })}
          maxLength={MAX_RESUMEN}
          rows={3}
          mostrarContador
          ayuda="Se muestra en las tarjetas del portal."
          error={errores.resumen}
        />

        <Grupo legend="Imagen de portada" error={errores.portada}>
          {campos.portada ? (
            <div className="flex flex-col gap-2 rounded-md border border-sand bg-panel p-3 sm:flex-row sm:items-center sm:gap-4">
              <img
                src={campos.portada.url}
                alt={campos.portada.textoAlternativo ?? ''}
                className="aspect-video w-full rounded object-cover sm:w-48 sm:shrink-0"
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
            <Boton variante="secundario" tamano="sm" icono={ImagePlus} onClick={() => setEligiendoPortada(true)}>
              {campos.portada ? 'Cambiar imagen' : 'Elegir imagen'}
            </Boton>
            {campos.portada && (
              <Boton variante="secundario" tamano="sm" icono={Trash2} onClick={() => cambiar({ portada: null })}>
                Quitar imagen
              </Boton>
            )}
          </div>
        </Grupo>

        <Grupo legend="Contenido" error={errores.contenido}>
          <Suspense
            fallback={
              <p role="status" className="flex items-center gap-2 rounded-md border border-sand bg-panel px-3 py-6 text-sm text-muted">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando el editor…
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
          onChange={(e) => {
            const urlExterna = e.target.value;
            cambiar({
              urlExterna,
              ...(urlExterna.trim() ? {} : { abrirEnlaceDirecto: false }),
            });
          }}
          error={errores.urlExterna}
          ayuda="Para una nota publicada en otro medio. Debe empezar con https://"
          maxLength={500}
          autoComplete="off"
        />

        <CampoCasilla
          etiqueta="«Leer nota» abre directamente el enlace externo"
          ayuda="Si no la marcas, «Leer nota» abre la noticia en el portal y el enlace aparece como botón dentro de ella."
          checked={Boolean(campos.urlExterna.trim()) && campos.abrirEnlaceDirecto}
          disabled={!campos.urlExterna.trim()}
          error={errores.abrirEnlaceDirecto}
          onChange={(e) => cambiar({ abrirEnlaceDirecto: e.target.checked })}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Fecha de publicación"
            type="datetime-local"
            value={campos.fechaPublicacion}
            onChange={(e) => cambiar({ fechaPublicacion: e.target.value })}
            error={errores.fechaPublicacion}
            ayuda="Fecha deseada (hora de Bolivia): se aplica al publicar o aprobar. Si es futura, queda programada."
          />

          <CampoTexto
            etiqueta="Fecha de expiración (opcional)"
            type="datetime-local"
            value={campos.fechaExpiracion}
            onChange={(e) => cambiar({ fechaExpiracion: e.target.value })}
            error={errores.fechaExpiracion}
            ayuda="Después de esta fecha deja de verse en el portal."
          />
        </div>

        <CampoCasilla
          etiqueta="Destacada en el portal"
          checked={campos.destacada}
          onChange={(e) => cambiar({ destacada: e.target.checked })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-5">
        <Boton
          type="submit"
          variante="primario"
          icono={Save}
          cargando={guardar.isPending}
          disabled={publicar.isPending}
        >
          {editando ? 'Guardar cambios' : 'Guardar borrador'}
        </Boton>
        {puedePublicar && (
          <Boton
            variante="secundario"
            icono={Rocket}
            onClick={publicarAviso}
            cargando={publicar.isPending}
            disabled={guardar.isPending}
          >
            Publicar
          </Boton>
        )}
        {puedeEnviar && (
          <Boton
            variante="secundario"
            icono={Send}
            onClick={confirmarEnvio}
            disabled={guardar.isPending || enviarRevision.isPending || publicar.isPending}
          >
            Enviar a revisión
          </Boton>
        )}
        <Boton variante="secundario" icono={Eye} onClick={() => setVerPrevia(true)}>
          Vista previa
        </Boton>
        <Boton como={Link} to={listadoVolver} variante="fantasma">
          {esAviso ? 'Volver a avisos' : 'Volver a publicaciones'}
        </Boton>
        {hayCambios && <p className="text-sm text-muted">Hay cambios sin guardar.</p>}
      </div>

      {confirmandoEnvio && (
        <Dialogo titulo="Enviar a revisión" onCerrar={() => setConfirmandoEnvio(false)} ancho="max-w-md">
          <p className="text-sm text-ink">
            El Párroco revisará la publicación y podrá aprobarla o rechazarla. Mientras esté en revisión no podrás editarla.
            {hayCambios && ' Se guardarán antes los cambios que tienes en pantalla.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Boton variante="secundario" onClick={() => setConfirmandoEnvio(false)} disabled={enviarRevision.isPending}>
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              onClick={() => enviarRevision.mutate(hayCambios ? construirCuerpo() : null)}
              cargando={enviarRevision.isPending}
            >
              Enviar a revisión
            </Boton>
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
      )}
    </form>
  );
}
