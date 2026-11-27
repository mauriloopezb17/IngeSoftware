import { lazy, Suspense, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';

import Dialogo from '../../componentes/Dialogo.jsx';
import MiniaturaArchivo from '../../multimedia/MiniaturaArchivo.jsx';
import SelectorImagenes from '../../multimedia/SelectorImagenes.jsx';
import { useBiblioteca } from '../../multimedia/useBiblioteca.js';
import SelectorGaleria from '../../proclamas/SelectorGaleria.jsx';
import { aContenido } from '../../publicaciones/contenido.js';
import { Aviso, Boton, CampoArea, CampoCasilla, CampoTexto } from '../../ui/index.js';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { extraerErroresApi } from '../componentes/errores.js';
import {
  actualizarDetalleServicio,
  actualizarServicio,
  CLAVE_SERVICIOS,
  crearServicio,
} from './api.js';

const EditorContenido = lazy(() => import('../../publicaciones/editor/EditorContenido.jsx'));

const MAX_REQUISITOS = 20;
const MAX_GALERIA = 24;

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

function mapearErrores(campos) {
  const resultado = { ...campos };
  if (campos['detalle.contenido'] && !resultado.contenido) resultado.contenido = campos['detalle.contenido'];
  if (campos['detalle.galeria'] && !resultado.galeria) resultado.galeria = campos['detalle.galeria'];
  if (campos['detalle.videoYoutubeId'] && !resultado.videoYoutubeId) {
    resultado.videoYoutubeId = campos['detalle.videoYoutubeId'];
  }
  return resultado;
}

export default function FormularioServicio({ servicio, soloDetalle = false, onGuardado, onCerrar }) {
  const esEdicion = Boolean(servicio);
  const queryClient = useQueryClient();

  const detalleInicial = servicio?.detalle ?? null;
  const [nombre, setNombre] = useState(servicio?.nombre ?? '');
  const [slug, setSlug] = useState(servicio?.slug ?? '');
  const [descripcionCorta, setDescripcionCorta] = useState(servicio?.descripcionCorta ?? '');
  const [icono, setIcono] = useState(servicio?.icono ?? '');
  const [imagen, setImagen] = useState(servicio?.imagen ?? null);
  const [galeriaIds, setGaleriaIds] = useState(() => detalleInicial?.galeria ?? []);
  const [bloques, setBloques] = useState(() => detalleInicial?.contenido?.bloques ?? []);
  const [videoYoutubeId, setVideoYoutubeId] = useState(detalleInicial?.videoYoutubeId ?? '');
  const [visible, setVisible] = useState(servicio?.visible ?? true);
  const [requisitos, setRequisitos] = useState(() =>
    (servicio?.contenido?.datos ?? []).map((item) => ({ ...item })),
  );

  const [archivosConocidos, setArchivosConocidos] = useState({});
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [erroresCampo, setErroresCampo] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const { data: bibliotecaImagenes } = useBiblioteca({
    clase: 'IMAGEN',
    orden: '-fechaSubida',
    pagina: 1,
    porPagina: 50,
  });
  const { data: bibliotecaVideos } = useBiblioteca({
    clase: 'VIDEO',
    orden: '-fechaSubida',
    pagina: 1,
    porPagina: 50,
  });

  const mapaArchivos = new Map();
  for (const a of bibliotecaImagenes?.datos ?? []) mapaArchivos.set(a.id, a);
  for (const a of bibliotecaVideos?.datos ?? []) mapaArchivos.set(a.id, a);
  for (const [id, a] of Object.entries(archivosConocidos)) mapaArchivos.set(Number(id), a);

  const huellaActual = JSON.stringify({
    nombre: nombre.trim(),
    slug: slug.trim(),
    descripcionCorta: descripcionCorta.trim(),
    icono,
    imagenId: imagen?.id ?? null,
    galeriaIds,
    bloques,
    videoYoutubeId: videoYoutubeId.trim(),
    visible,
    requisitos,
  });
  const [huellaInicial] = useState(huellaActual);
  const hayCambios = huellaActual !== huellaInicial;

  const { mutate, isPending } = useMutation({
    mutationFn: (cuerpo) => {
      if (esEdicion && soloDetalle) return actualizarDetalleServicio(servicio.id, cuerpo);
      if (esEdicion) return actualizarServicio(servicio.id, cuerpo);
      return crearServicio(cuerpo);
    },
    onSuccess: (guardado) => {
      queryClient.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
      onGuardado(guardado);
    },
    onError: (err) => {
      const { general, campos } = extraerErroresApi(err);
      setErroresCampo(mapearErrores(campos));
      setErrorGeneral(general);
    },
  });

  function intentarCerrar() {
    if (isPending) return;
    if (hayCambios) {
      setConfirmarSalida(true);
      return;
    }
    onCerrar();
  }

  function agregarRequisito() {
    if (requisitos.length >= MAX_REQUISITOS) return;
    setRequisitos((prev) => [...prev, { etiqueta: '', valor: '' }]);
  }

  function actualizarRequisito(indice, campo, valor) {
    setRequisitos((prev) =>
      prev.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    );
  }

  function eliminarRequisito(indice) {
    setRequisitos((prev) => prev.filter((_, i) => i !== indice));
  }

  function moverRequisito(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= requisitos.length) return;
    setRequisitos((prev) => {
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

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
    setErroresCampo({});
    setErrorGeneral('');

    const contenidoBloques = hayContenidoEnBloques(bloques) ? aContenido(bloques) : null;
    const yt = videoYoutubeId.trim() || null;
    const detallePayload =
      !contenidoBloques && galeriaIds.length === 0 && !yt
        ? null
        : {
            contenido: contenidoBloques,
            galeria: galeriaIds,
            videoYoutubeId: yt,
          };

    const datosPagina = {
      imagenId: imagen?.id ?? null,
      detalle: detallePayload,
    };

    if (esEdicion && soloDetalle) {
      mutate(datosPagina);
      return;
    }

    mutate({
      nombre: nombre.trim(),
      slug: slug.trim() || null,
      descripcionCorta: descripcionCorta.trim(),
      icono: icono || null,
      visible,
      contenido: {
        datos: requisitos.map((r) => ({
          etiqueta: r.etiqueta.trim(),
          valor: r.valor.trim(),
        })),
      },
      ...datosPagina,
    });
  }

  return (
    <>
      <Dialogo
        titulo={esEdicion ? 'Editar servicio' : 'Nuevo servicio'}
        onCerrar={intentarCerrar}
        ancho="max-w-3xl"
      >
        <form onSubmit={enviar} noValidate className="flex flex-col gap-5">
          {errorGeneral && (
            <Aviso tipo="error">
              <p>{errorGeneral}</p>
            </Aviso>
          )}

          {soloDetalle && (
            <Aviso tipo="info">
              <p>
                Puedes editar la página del sacramento, su foto principal, la galería y el video. El
                nombre, los requisitos y la visibilidad los gestiona secretaría o administración.
              </p>
            </Aviso>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              placeholder="Ej. Bautismo"
              error={erroresCampo.nombre}
              disabled={isPending || soloDetalle}
            />
            <CampoTexto
              etiqueta="Slug (opcional)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Se genera automáticamente si queda vacío"
              error={erroresCampo.slug}
              disabled={isPending || soloDetalle}
            />
          </div>

          <CampoArea
            etiqueta="Descripción corta"
            value={descripcionCorta}
            onChange={(e) => setDescripcionCorta(e.target.value)}
            maxLength={300}
            rows={3}
            mostrarContador
            error={erroresCampo.descripcionCorta}
            disabled={isPending || soloDetalle}
          />

          <SelectorIcono
            valor={icono}
            onChange={setIcono}
            error={erroresCampo.icono}
            disabled={isPending || soloDetalle}
          />

          <fieldset className="rounded-lg border border-sand bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm font-semibold text-ink">
                Requisitos y detalles ({requisitos.length}/{MAX_REQUISITOS})
              </legend>
              <Boton
                variante="secundario"
                tamano="sm"
                icono={Plus}
                onClick={agregarRequisito}
                disabled={isPending || soloDetalle || requisitos.length >= MAX_REQUISITOS}
              >
                Agregar requisito
              </Boton>
            </div>
            {erroresCampo.contenido && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-danger">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>{erroresCampo.contenido}</span>
              </p>
            )}

            {requisitos.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Todavía no hay pares etiqueta–valor para «Ver requisitos».
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {requisitos.map((item, i) => (
                  <li key={i} className="rounded-md border border-sand bg-white p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CampoTexto
                        etiqueta={`Etiqueta ${i + 1}`}
                        value={item.etiqueta}
                        onChange={(e) => actualizarRequisito(i, 'etiqueta', e.target.value)}
                        maxLength={60}
                        placeholder="Ej. Charla pre-bautismal"
                        error={erroresCampo[`contenido.datos.${i}.etiqueta`]}
                        disabled={isPending || soloDetalle}
                      />
                      <CampoTexto
                        etiqueta={`Valor ${i + 1}`}
                        value={item.valor}
                        onChange={(e) => actualizarRequisito(i, 'valor', e.target.value)}
                        maxLength={300}
                        placeholder="Ej. Primer sábado de cada mes"
                        error={erroresCampo[`contenido.datos.${i}.valor`]}
                        disabled={isPending || soloDetalle}
                      />
                    </div>
                    {!soloDetalle && (
                      <div className="mt-2 flex justify-end gap-1.5">
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          onClick={() => moverRequisito(i, -1)}
                          disabled={isPending || i === 0}
                          aria-label={`Subir requisito ${i + 1}`}
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </Boton>
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          onClick={() => moverRequisito(i, 1)}
                          disabled={isPending || i === requisitos.length - 1}
                          aria-label={`Bajar requisito ${i + 1}`}
                        >
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        </Boton>
                        <Boton
                          variante="secundario"
                          tamano="sm"
                          onClick={() => eliminarRequisito(i)}
                          disabled={isPending}
                          aria-label={`Quitar requisito ${i + 1}`}
                        >
                          <Trash2 className="size-3.5 text-danger" aria-hidden="true" />
                        </Boton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </fieldset>

          <CampoCasilla
            etiqueta="Visible en el portal público"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            disabled={isPending || soloDetalle}
          />

          <section
            aria-labelledby="titulo-pagina-sacramento"
            className="flex flex-col gap-4 rounded-lg border border-sand bg-panel p-4"
          >
            <h3 id="titulo-pagina-sacramento" className="text-base font-semibold text-ink">
              Página del sacramento
            </h3>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-ink">Imagen (opcional)</span>
              {imagen ? (
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-sand bg-white p-3">
                  <img
                    src={imagen.url}
                    alt={imagen.textoAlternativo || nombre || 'Imagen del sacramento'}
                    className="size-20 rounded-md object-cover"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Boton
                      variante="secundario"
                      tamano="sm"
                      onClick={() => setSelectorAbierto(true)}
                      disabled={isPending}
                    >
                      Cambiar imagen
                    </Boton>
                    <Boton
                      variante="peligro"
                      tamano="sm"
                      icono={X}
                      onClick={() => setImagen(null)}
                      disabled={isPending}
                    >
                      Quitar imagen
                    </Boton>
                  </div>
                </div>
              ) : (
                <div>
                  <Boton
                    variante="secundario"
                    tamano="sm"
                    icono={ImagePlus}
                    onClick={() => setSelectorAbierto(true)}
                    disabled={isPending}
                  >
                    Elegir imagen
                  </Boton>
                </div>
              )}
              {erroresCampo.imagenId && (
                <p className="flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{erroresCampo.imagenId}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  Galería de fotos y videos ({galeriaIds.length}/{MAX_GALERIA})
                </span>
                <Boton
                  variante="secundario"
                  tamano="sm"
                  icono={Plus}
                  disabled={isPending || galeriaIds.length >= MAX_GALERIA}
                  onClick={() => setGaleriaAbierta(true)}
                >
                  Agregar a la galería
                </Boton>
              </div>
              {galeriaIds.length > 0 && (
                <ul aria-label="Elementos de la galería" className="grid gap-2 sm:grid-cols-2">
                  {galeriaIds.map((archivoId, indice) => {
                    const archivo = mapaArchivos.get(archivoId);
                    return (
                      <li
                        key={`${archivoId}-${indice}`}
                        className="flex items-center justify-between gap-2 rounded-md border border-sand bg-white p-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="size-12 shrink-0 overflow-hidden rounded bg-panel">
                            {archivo ? (
                              <MiniaturaArchivo archivo={archivo} />
                            ) : (
                              <span className="flex h-full items-center justify-center text-xs text-muted">
                                #{archivoId}
                              </span>
                            )}
                          </div>
                          <span className="truncate text-xs font-medium text-ink">
                            {archivo?.nombreOriginal ?? `Archivo #${archivoId}`}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            icono={ArrowUp}
                            disabled={isPending || indice === 0}
                            onClick={() => moverGaleria(indice, -1)}
                            aria-label={`Subir elemento ${indice + 1} de la galería`}
                          />
                          <Boton
                            variante="secundario"
                            tamano="sm"
                            icono={ArrowDown}
                            disabled={isPending || indice === galeriaIds.length - 1}
                            onClick={() => moverGaleria(indice, 1)}
                            aria-label={`Bajar elemento ${indice + 1} de la galería`}
                          />
                          <Boton
                            variante="peligro"
                            tamano="sm"
                            icono={Trash2}
                            disabled={isPending}
                            onClick={() => quitarDeGaleria(indice)}
                            aria-label={`Quitar elemento ${indice + 1} de la galería`}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {erroresCampo.galeria && (
                <p className="flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{erroresCampo.galeria}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink">Contenido de la página (opcional)</span>
              <Suspense
                fallback={
                  <div className="flex items-center gap-2 rounded-md border border-sand bg-white p-4 text-sm text-muted">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Cargando editor…</span>
                  </div>
                }
              >
                <EditorContenido
                  valorInicial={detalleInicial?.contenido ?? null}
                  alCambiar={setBloques}
                  alIniciar={setBloques}
                  soloLectura={isPending}
                  etiqueta="Contenido de la página del sacramento"
                />
              </Suspense>
              {erroresCampo.contenido && (
                <p className="flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{erroresCampo.contenido}</span>
                </p>
              )}
            </div>

            <CampoTexto
              etiqueta="Video de YouTube (opcional)"
              value={videoYoutubeId}
              onChange={(e) => setVideoYoutubeId(e.target.value)}
              placeholder="URL de YouTube o código de 11 caracteres"
              error={erroresCampo.videoYoutubeId}
              disabled={isPending}
            />
          </section>

          <div className="mt-2 flex justify-end gap-2 border-t border-sand pt-4">
            <Boton variante="secundario" onClick={intentarCerrar} disabled={isPending}>
              Cancelar
            </Boton>
            <Boton type="submit" variante="primario" cargando={isPending}>
              {isPending ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear servicio'}
            </Boton>
          </div>
        </form>
      </Dialogo>

      {selectorAbierto && (
        <SelectorImagenes
          titulo="Elegir imagen del sacramento"
          seleccionada={imagen?.id}
          onSeleccionar={(elegida) => {
            setImagen(elegida);
            setSelectorAbierto(false);
          }}
          onCerrar={() => setSelectorAbierto(false)}
        />
      )}

      {galeriaAbierta && (
        <SelectorGaleria
          yaElegidos={galeriaIds}
          onSeleccionar={(archivo) => {
            setArchivosConocidos((prev) => ({ ...prev, [archivo.id]: archivo }));
            setGaleriaIds((actual) =>
              actual.includes(archivo.id) || actual.length >= MAX_GALERIA ? actual : [...actual, archivo.id],
            );
            setGaleriaAbierta(false);
          }}
          onCerrar={() => setGaleriaAbierta(false)}
        />
      )}

      {confirmarSalida && (
        <Dialogo titulo="Hay cambios sin guardar" onCerrar={() => setConfirmarSalida(false)} ancho="max-w-md">
          <p className="text-sm text-ink">
            Si sales de esta pantalla ahora, perderás los cambios que no guardaste.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Boton variante="primario" onClick={() => setConfirmarSalida(false)}>
              Seguir editando
            </Boton>
            <Boton
              variante="peligro"
              onClick={() => {
                setConfirmarSalida(false);
                onCerrar();
              }}
            >
              Salir sin guardar
            </Boton>
          </div>
        </Dialogo>
      )}
    </>
  );
}
