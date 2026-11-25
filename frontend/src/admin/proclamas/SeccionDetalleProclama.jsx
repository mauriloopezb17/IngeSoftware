import { lazy, Suspense, useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { erroresDe, resumenDeErrores } from '../componentes/erroresFormulario.js';
import MiniaturaArchivo from '../multimedia/MiniaturaArchivo.jsx';
import SelectorImagenes from '../multimedia/SelectorImagenes.jsx';
import { useBiblioteca } from '../multimedia/useBiblioteca.js';
import { aContenido } from '../publicaciones/contenido.js';
import { Aviso, Boton, CampoTexto, useToast } from '../ui/index.js';
import { actualizarDetalleProclama, CLAVE_PROCLAMAS } from './api.js';
import SelectorGaleria from './SelectorGaleria.jsx';

const EditorContenido = lazy(() => import('../publicaciones/editor/EditorContenido.jsx'));

const MAX_GALERIA = 12;

const CAMPO_DE_ERROR = {
  imagenId: 'imagenId',
  'detalle.contenido': 'contenido',
  'detalle.galeria': 'galeria',
  'detalle.lugar.templo': 'templo',
  'detalle.lugar.direccion': 'direccion',
  'detalle.lugar.enlaceMapa': 'enlaceMapa',
};

function esUrlGoogleMaps(valor) {
  try {
    const { protocol, hostname, pathname } = new URL(valor);
    if (protocol !== 'https:') return false;
    const host = hostname.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host.startsWith('maps.google.') ||
      ((host === 'google.com' || host.endsWith('.google.com')) && pathname.startsWith('/maps')) ||
      (host === 'goo.gl' && pathname.startsWith('/maps'))
    );
  } catch {
    return false;
  }
}

function hayContenidoEnBloques(bloques = []) {
  return bloques.some((b) => {
    if (b.type !== 'paragraph') return true;
    const texto = (b.content ?? [])
      .map((p) => (p.type === 'link' ? (p.content ?? []).map((x) => x.text).join('') : p.text))
      .join('')
      .trim();
    return texto !== '' || (b.children ?? []).length > 0;
  });
}

// Sección CMS acotada para editar foto principal, galería, descripción y lugar de la boda.
export default function SeccionDetalleProclama({ proclama, editable }) {
  const clienteConsultas = useQueryClient();
  const toast = useToast();
  const avisos = useRef(null);
  const idCheckboxLugar = useId();

  const detalleInicial = proclama.detalle ?? null;
  const [imagenId, setImagenId] = useState(proclama.imagenId ?? null);
  const [galeriaIds, setGaleriaIds] = useState(() => detalleInicial?.galeria ?? []);
  const [bloques, setBloques] = useState(() => detalleInicial?.contenido?.bloques ?? []);
  const [enEstaParroquia, setEnEstaParroquia] = useState(() => !detalleInicial?.lugar);
  const [lugar, setLugar] = useState(() => ({
    templo: detalleInicial?.lugar?.templo ?? '',
    direccion: detalleInicial?.lugar?.direccion ?? '',
    enlaceMapa: detalleInicial?.lugar?.enlaceMapa ?? '',
  }));

  const [archivosConocidos, setArchivosConocidos] = useState({});
  const [abriendoFoto, setAbriendoFoto] = useState(false);
  const [abriendoGaleria, setAbriendoGaleria] = useState(false);
  const [errores, setErrores] = useState({});
  const [generales, setGenerales] = useState([]);

  const { data: bibliotecaImagenes } = useBiblioteca({ clase: 'IMAGEN', orden: '-fechaSubida', pagina: 1, porPagina: 50 });
  const { data: bibliotecaVideos } = useBiblioteca({ clase: 'VIDEO', orden: '-fechaSubida', pagina: 1, porPagina: 50 });

  const mapaArchivos = new Map();
  for (const a of bibliotecaImagenes?.datos ?? []) mapaArchivos.set(a.id, a);
  for (const a of bibliotecaVideos?.datos ?? []) mapaArchivos.set(a.id, a);
  for (const [id, a] of Object.entries(archivosConocidos)) mapaArchivos.set(Number(id), a);

  const fotoActual = imagenId ? mapaArchivos.get(imagenId) : null;

  function mostrar(porCampo, avisosGenerales = []) {
    setErrores(porCampo);
    setGenerales(avisosGenerales);
    requestAnimationFrame(() => avisos.current?.focus());
  }

  const guardar = useMutation({
    mutationFn: (cuerpo) => actualizarDetalleProclama(proclama.id, cuerpo),
    onSuccess: () => {
      clienteConsultas.invalidateQueries({ queryKey: CLAVE_PROCLAMAS });
      setErrores({});
      setGenerales([]);
      toast.exito('Página de la proclama guardada.');
    },
    onError: (error) => {
      const { errores: porCampo, generales: g } = erroresDe(error, CAMPO_DE_ERROR);
      mostrar(porCampo, g);
    },
  });

  function moverGaleria(indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= galeriaIds.length) return;
    const copia = [...galeriaIds];
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    setGaleriaIds(copia);
  }

  function quitarDeGaleria(indice) {
    setGaleriaIds((actual) => actual.filter((_, i) => i !== indice));
  }

  function enviar(evento) {
    evento.preventDefault();
    const locales = {};
    if (!enEstaParroquia) {
      const templo = lugar.templo.trim();
      if (!templo) locales.templo = 'Indica el nombre del templo o capilla.';
      else if (templo.length > 150) locales.templo = 'Puede tener hasta 150 caracteres.';
      if (lugar.direccion.trim().length > 200) locales.direccion = 'Puede tener hasta 200 caracteres.';
      if (lugar.enlaceMapa.trim() && !esUrlGoogleMaps(lugar.enlaceMapa.trim())) {
        locales.enlaceMapa = 'Debe ser un enlace https:// de Google Maps.';
      }
    }
    if (Object.keys(locales).length) {
      mostrar(locales);
      return;
    }

    const contenido = hayContenidoEnBloques(bloques) ? aContenido(bloques) : null;
    const lugarPayload = enEstaParroquia
      ? null
      : {
          templo: lugar.templo.trim(),
          direccion: lugar.direccion.trim() || null,
          enlaceMapa: lugar.enlaceMapa.trim() || null,
        };

    const detallePayload =
      !contenido && galeriaIds.length === 0 && !lugarPayload
        ? null
        : {
            contenido,
            galeria: galeriaIds,
            lugar: lugarPayload,
          };

    guardar.mutate({
      imagenId: imagenId ?? null,
      detalle: detallePayload,
    });
  }

  const mensajes = resumenDeErrores(errores, generales);

  return (
    <section aria-labelledby="titulo-pagina-proclama" className="mt-8 rounded-lg border border-sand bg-white p-5 sm:p-6">
      <div className="border-b border-sand pb-4">
        <h2 id="titulo-pagina-proclama" className="text-lg font-semibold text-ink">
          Página de la proclama
        </h2>
        <p className="mt-1 text-sm text-muted">
          Información opcional que se muestra al abrir esta proclama en el portal.
        </p>
      </div>

      <form onSubmit={enviar} noValidate className="mt-5 flex flex-col gap-6">
        <div ref={avisos} tabIndex={-1} className="outline-none">
          {mensajes.length > 0 && (
            <Aviso tipo="error" titulo="No se pudo guardar la página. Revisa lo siguiente:">
              <ul className="mt-1 list-disc pl-5">
                {mensajes.map((m, i) => (
                  <li key={`${i}-${m}`}>{m}</li>
                ))}
              </ul>
            </Aviso>
          )}
        </div>

        {/* Foto de los novios */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-ink">Foto de los novios (opcional)</span>
          <p className="text-xs text-muted">Publícala solo con la autorización de los novios.</p>
          {imagenId ? (
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sand bg-panel p-3">
              <div className="h-24 w-32 shrink-0 overflow-hidden rounded border border-sand bg-white">
                {fotoActual ? (
                  <MiniaturaArchivo archivo={fotoActual} />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">Imagen #{imagenId}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {fotoActual?.nombreOriginal ?? `Imagen #${imagenId}`}
                </p>
                {editable && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Boton variante="secundario" tamano="sm" icono={ImagePlus} onClick={() => setAbriendoFoto(true)}>
                      Cambiar foto
                    </Boton>
                    <Boton variante="secundario" tamano="sm" icono={Trash2} onClick={() => setImagenId(null)}>
                      Quitar foto
                    </Boton>
                  </div>
                )}
              </div>
            </div>
          ) : (
            editable && (
              <div>
                <Boton variante="secundario" tamano="sm" icono={ImagePlus} onClick={() => setAbriendoFoto(true)}>
                  Elegir foto
                </Boton>
              </div>
            )
          )}
          {errores.imagenId && <p className="text-xs font-medium text-danger">{errores.imagenId}</p>}
        </div>

        {/* Galería */}
        <div className="flex flex-col gap-2 border-t border-sand pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-ink">Galería (opcional)</span>
              <p className="text-xs text-muted">Hasta {MAX_GALERIA} fotos o videos de la biblioteca.</p>
            </div>
            {editable && (
              <Boton
                variante="secundario"
                tamano="sm"
                icono={Plus}
                disabled={galeriaIds.length >= MAX_GALERIA}
                onClick={() => setAbriendoGaleria(true)}
              >
                Agregar a la galería
              </Boton>
            )}
          </div>

          {galeriaIds.length > 0 ? (
            <ul aria-label="Archivos de la galería" className="mt-2 flex flex-col gap-2">
              {galeriaIds.map((archivoId, indice) => {
                const archivo = mapaArchivos.get(archivoId);
                return (
                  <li
                    key={`${archivoId}-${indice}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-sand bg-panel p-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-sand bg-white">
                        {archivo ? (
                          <MiniaturaArchivo archivo={archivo} />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted">
                            #{archivoId}
                          </div>
                        )}
                      </div>
                      <span className="truncate text-sm font-medium text-ink">
                        {archivo?.nombreOriginal ?? `Archivo #${archivoId}`}
                      </span>
                    </div>
                    {editable && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          icono={ArrowUp}
                          disabled={indice === 0}
                          onClick={() => moverGaleria(indice, -1)}
                          aria-label={`Subir elemento ${indice + 1}`}
                        />
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          icono={ArrowDown}
                          disabled={indice === galeriaIds.length - 1}
                          onClick={() => moverGaleria(indice, 1)}
                          aria-label={`Bajar elemento ${indice + 1}`}
                        />
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          icono={Trash2}
                          onClick={() => quitarDeGaleria(indice)}
                          aria-label={`Quitar elemento ${indice + 1}`}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted">Sin archivos en la galería.</p>
          )}
          {errores.galeria && <p className="text-xs font-medium text-danger">{errores.galeria}</p>}
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-2 border-t border-sand pt-5">
          <span className="text-sm font-semibold text-ink">Descripción (opcional)</span>
          <Suspense
            fallback={
              <p
                role="status"
                className="flex items-center gap-2 rounded-md border border-sand bg-panel px-3 py-6 text-sm text-muted"
              >
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando el
                editor…
              </p>
            }
          >
            <EditorContenido
              etiqueta="Descripción de la proclama"
              valorInicial={detalleInicial?.contenido}
              alIniciar={(documento) => setBloques(documento)}
              alCambiar={setBloques}
            />
          </Suspense>
          {errores.contenido && <p className="text-xs font-medium text-danger">{errores.contenido}</p>}
        </div>

        {/* Lugar de la boda */}
        <div className="flex flex-col gap-3 border-t border-sand pt-5">
          <span className="text-sm font-semibold text-ink">Lugar de la boda</span>
          <label htmlFor={idCheckboxLugar} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              id={idCheckboxLugar}
              type="checkbox"
              checked={enEstaParroquia}
              disabled={!editable}
              onChange={(e) => setEnEstaParroquia(e.target.checked)}
              className="size-4 rounded border-sand accent-ink"
            />
            Se celebra en esta parroquia
          </label>

          {!enEstaParroquia && (
            <div className="flex flex-col gap-4 rounded-md border border-sand bg-panel p-4">
              <CampoTexto
                etiqueta="Templo o capilla"
                value={lugar.templo}
                onChange={(e) => setLugar((actual) => ({ ...actual, templo: e.target.value }))}
                error={errores.templo}
                maxLength={150}
                required
                disabled={!editable}
              />
              <CampoTexto
                etiqueta="Dirección (opcional)"
                value={lugar.direccion}
                onChange={(e) => setLugar((actual) => ({ ...actual, direccion: e.target.value }))}
                error={errores.direccion}
                maxLength={200}
                disabled={!editable}
              />
              <CampoTexto
                etiqueta="Enlace de Google Maps (opcional)"
                type="url"
                value={lugar.enlaceMapa}
                onChange={(e) => setLugar((actual) => ({ ...actual, enlaceMapa: e.target.value }))}
                error={errores.enlaceMapa}
                maxLength={500}
                ayuda="Enlace https:// de Google Maps para el botón «Cómo llegar»."
                disabled={!editable}
              />
            </div>
          )}
        </div>

        {editable && (
          <div className="flex flex-wrap items-center gap-3 border-t border-sand pt-5">
            <Boton type="submit" variante="primario" icono={Save} cargando={guardar.isPending}>
              Guardar página
            </Boton>
          </div>
        )}
      </form>

      {abriendoFoto && (
        <SelectorImagenes
          titulo="Elegir foto de los novios"
          onSeleccionar={(img) => {
            setImagenId(img.id);
            setArchivosConocidos((actual) => ({
              ...actual,
              [img.id]: {
                id: img.id,
                url: img.url,
                nombreOriginal: img.textoAlternativo || `Imagen #${img.id}`,
                textoAlternativo: img.textoAlternativo,
                tipoMime: 'image/webp',
              },
            }));
            setAbriendoFoto(false);
          }}
          onCerrar={() => setAbriendoFoto(false)}
        />
      )}

      {abriendoGaleria && (
        <SelectorGaleria
          yaElegidos={galeriaIds}
          onSeleccionar={(archivo) => {
            setGaleriaIds((actual) => (actual.includes(archivo.id) ? actual : [...actual, archivo.id]));
            setArchivosConocidos((actual) => ({ ...actual, [archivo.id]: archivo }));
            setAbriendoGaleria(false);
          }}
          onCerrar={() => setAbriendoGaleria(false)}
        />
      )}
    </section>
  );
}
