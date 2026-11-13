import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';

import CampoTexto from '../../componentes/CampoTexto.jsx';
import CampoArea from '../componentes/CampoArea.jsx';
import CampoSelect from '../componentes/CampoSelect.jsx';
import SelectorIcono from '../componentes/SelectorIcono.jsx';
import { listarVideosBiblioteca } from './api.js';

function campoError(errores, clave) {
  return errores[`contenido.${clave}`] || errores[clave];
}

function ImagenPreviewCampo({
  etiqueta,
  url,
  textoAlt,
  errorUrl,
  errorAlt,
  onElegir,
  onQuitar,
  onChangeUrl,
  onChangeAlt,
  mostrarAlt = true,
  deshabilitado,
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-cream/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{etiqueta}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onElegir}
            disabled={deshabilitado}
            className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone focus-visible:outline-2 focus-visible:outline-goldDark"
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
            {url ? 'Cambiar de biblioteca' : 'Elegir de biblioteca'}
          </button>
          {url && (
            <button
              type="button"
              onClick={onQuitar}
              disabled={deshabilitado}
              className="rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium text-muted hover:text-redParish focus-visible:outline-2 focus-visible:outline-goldDark"
            >
              Quitar imagen
            </button>
          )}
        </div>
      </div>

      {url && (
        <div className="flex items-center gap-3">
          <img
            src={url}
            alt={textoAlt || etiqueta}
            className="h-16 w-24 shrink-0 rounded-md border border-borderSoft object-cover"
          />
          <p className="min-w-0 break-all text-xs text-muted">{url}</p>
        </div>
      )}

      {onChangeUrl && (
        <CampoTexto
          etiqueta={`URL de ${etiqueta.toLowerCase()}`}
          value={url ?? ''}
          onChange={(e) => onChangeUrl(e.target.value)}
          placeholder="/media/seed/... o https://..."
          error={errorUrl}
          disabled={deshabilitado}
        />
      )}

      {!onChangeUrl && errorUrl && <p className="text-sm text-redParish">{errorUrl}</p>}

      {mostrarAlt && (
        <CampoTexto
          etiqueta={`Texto alternativo (${etiqueta.toLowerCase()})`}
          value={textoAlt ?? ''}
          onChange={(e) => onChangeAlt(e.target.value)}
          maxLength={255}
          error={errorAlt}
          disabled={deshabilitado}
        />
      )}
    </div>
  );
}

export default function CamposBloque({
  tipo,
  contenido,
  onChange,
  onAbrirSelector,
  errores,
  deshabilitado,
}) {
  const idTarjetaCheck = useId();

  const videosQuery = useQuery({
    queryKey: ['admin', 'multimedia', 'videos'],
    queryFn: listarVideosBiblioteca,
    enabled: tipo === 'hero_video',
  });

  function actualizar(parcial) {
    onChange({ ...contenido, ...parcial });
  }

  return (
    <>
      {tipo === 'hero_video' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Título"
              value={contenido.titulo ?? ''}
              onChange={(e) => actualizar({ titulo: e.target.value })}
              maxLength={80}
              error={campoError(errores, 'titulo')}
              disabled={deshabilitado}
            />
            <CampoTexto
              etiqueta="Etiqueta superior (opcional)"
              value={contenido.etiqueta ?? ''}
              onChange={(e) => actualizar({ etiqueta: e.target.value })}
              maxLength={80}
              error={campoError(errores, 'etiqueta')}
              disabled={deshabilitado}
            />
          </div>

          <CampoArea
            etiqueta="Subtítulo (opcional)"
            value={contenido.subtitulo ?? ''}
            onChange={(e) => actualizar({ subtitulo: e.target.value })}
            maxLength={300}
            rows={2}
            error={campoError(errores, 'subtitulo')}
            disabled={deshabilitado}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoSelect
              etiqueta="Elegir video de la biblioteca"
              value={(videosQuery.data ?? []).some((v) => v.url === contenido.url_video) ? contenido.url_video : ''}
              onChange={(e) => {
                if (e.target.value) actualizar({ url_video: e.target.value });
              }}
              disabled={deshabilitado}
            >
              <option value="">Selecciona un video MP4 o WebM…</option>
              {(videosQuery.data ?? []).map((video) => (
                <option key={video.id} value={video.url}>
                  {video.nombreOriginal}
                </option>
              ))}
            </CampoSelect>

            <CampoTexto
              etiqueta="URL del video (MP4 o WebM)"
              value={contenido.url_video ?? ''}
              onChange={(e) => actualizar({ url_video: e.target.value })}
              placeholder="/media/seed/portada-final.mp4"
              error={campoError(errores, 'url_video')}
              disabled={deshabilitado}
            />
          </div>

          <ImagenPreviewCampo
            etiqueta="Imagen póster (opcional)"
            url={contenido.url_poster ?? ''}
            onElegir={() => onAbrirSelector({ destino: 'poster' })}
            onQuitar={() => actualizar({ url_poster: '' })}
            onChangeUrl={(url) => actualizar({ url_poster: url })}
            mostrarAlt={false}
            errorUrl={campoError(errores, 'url_poster')}
            deshabilitado={deshabilitado}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Título del botón de video (opcional)"
              value={contenido.texto_video ?? ''}
              onChange={(e) => actualizar({ texto_video: e.target.value })}
              maxLength={60}
              placeholder="Ej. Video institucional"
              error={campoError(errores, 'texto_video')}
              disabled={deshabilitado}
            />
            <CampoTexto
              etiqueta="Detalle del video (opcional)"
              value={contenido.detalle_video ?? ''}
              onChange={(e) => actualizar({ detalle_video: e.target.value })}
              maxLength={60}
              placeholder="Ej. Recorrido aéreo · 0:30"
              error={campoError(errores, 'detalle_video')}
              disabled={deshabilitado}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-borderSoft p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-ink">Botones (hasta 3)</span>
                {campoError(errores, 'botones') && (
                  <p className="text-sm text-redParish">{campoError(errores, 'botones')}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const actuales = contenido.botones ?? [];
                  if (actuales.length >= 3) return;
                  actualizar({ botones: [...actuales, { texto: '', enlace: '' }] });
                }}
                disabled={deshabilitado || (contenido.botones?.length ?? 0) >= 3}
                className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone disabled:opacity-50"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Agregar botón
              </button>
            </div>

            {(contenido.botones ?? []).map((boton, i) => (
              <div key={i} className="grid items-start gap-3 rounded-md bg-cream/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <CampoTexto
                  etiqueta={`Texto del botón ${i + 1}`}
                  value={boton.texto ?? ''}
                  onChange={(e) => {
                    const botones = contenido.botones.map((b, idx) =>
                      idx === i ? { ...b, texto: e.target.value } : b,
                    );
                    actualizar({ botones });
                  }}
                  maxLength={40}
                  error={campoError(errores, `botones.${i}.texto`)}
                  disabled={deshabilitado}
                />
                <CampoTexto
                  etiqueta={`Enlace del botón ${i + 1}`}
                  value={boton.enlace ?? ''}
                  onChange={(e) => {
                    const botones = contenido.botones.map((b, idx) =>
                      idx === i ? { ...b, enlace: e.target.value } : b,
                    );
                    actualizar({ botones });
                  }}
                  placeholder="#horarios o /paginas/historia"
                  error={campoError(errores, `botones.${i}.enlace`)}
                  disabled={deshabilitado}
                />
                <button
                  type="button"
                  onClick={() =>
                    actualizar({ botones: contenido.botones.filter((_, idx) => idx !== i) })
                  }
                  disabled={deshabilitado}
                  aria-label={`Quitar botón ${i + 1}`}
                  className="mt-7 rounded-md border border-borderSoft bg-white p-2 text-muted hover:text-redParish focus-visible:outline-2 focus-visible:outline-redParish"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tipo === 'texto_imagen' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Título"
              value={contenido.titulo ?? ''}
              onChange={(e) => actualizar({ titulo: e.target.value })}
              maxLength={120}
              error={campoError(errores, 'titulo')}
              disabled={deshabilitado}
            />
            <CampoTexto
              etiqueta="Etiqueta superior (opcional)"
              value={contenido.etiqueta ?? ''}
              onChange={(e) => actualizar({ etiqueta: e.target.value })}
              maxLength={80}
              error={campoError(errores, 'etiqueta')}
              disabled={deshabilitado}
            />
          </div>

          <CampoArea
            etiqueta="Texto"
            value={contenido.texto ?? ''}
            onChange={(e) => actualizar({ texto: e.target.value })}
            maxLength={3000}
            rows={5}
            ayuda="Separa párrafos con una línea en blanco."
            error={campoError(errores, 'texto')}
            disabled={deshabilitado}
          />

          <CampoSelect
            etiqueta="Posición de la imagen"
            value={contenido.posicion_imagen ?? 'izquierda'}
            onChange={(e) => actualizar({ posicion_imagen: e.target.value })}
            error={campoError(errores, 'posicion_imagen')}
            disabled={deshabilitado}
          >
            <option value="izquierda">Izquierda</option>
            <option value="derecha">Derecha</option>
          </CampoSelect>

          <ImagenPreviewCampo
            etiqueta="Imagen (opcional)"
            url={contenido.url_imagen ?? ''}
            textoAlt={contenido.texto_alternativo ?? ''}
            onElegir={() => onAbrirSelector({ destino: 'texto_imagen' })}
            onQuitar={() => actualizar({ url_imagen: '', texto_alternativo: '' })}
            onChangeAlt={(val) => actualizar({ texto_alternativo: val })}
            errorUrl={campoError(errores, 'url_imagen')}
            errorAlt={campoError(errores, 'texto_alternativo')}
            deshabilitado={deshabilitado}
          />

          <div className="flex flex-col gap-3 rounded-lg border border-borderSoft p-3">
            <label htmlFor={idTarjetaCheck} className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                id={idTarjetaCheck}
                type="checkbox"
                checked={Boolean(contenido.tarjeta)}
                onChange={(e) =>
                  actualizar({
                    tarjeta: e.target.checked
                      ? { etiqueta: '', titulo: '', descripcion: '' }
                      : null,
                  })
                }
                disabled={deshabilitado}
                className="size-4 accent-goldDark"
              />
              Incluir tarjeta superpuesta sobre la imagen
            </label>

            {contenido.tarjeta && (
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoTexto
                  etiqueta="Título de la tarjeta"
                  value={contenido.tarjeta.titulo ?? ''}
                  onChange={(e) =>
                    actualizar({ tarjeta: { ...contenido.tarjeta, titulo: e.target.value } })
                  }
                  maxLength={80}
                  error={campoError(errores, 'tarjeta.titulo')}
                  disabled={deshabilitado}
                />
                <CampoTexto
                  etiqueta="Etiqueta de la tarjeta (opcional)"
                  value={contenido.tarjeta.etiqueta ?? ''}
                  onChange={(e) =>
                    actualizar({ tarjeta: { ...contenido.tarjeta, etiqueta: e.target.value } })
                  }
                  maxLength={60}
                  error={campoError(errores, 'tarjeta.etiqueta')}
                  disabled={deshabilitado}
                />
                <div className="sm:col-span-2">
                  <CampoTexto
                    etiqueta="Descripción de la tarjeta (opcional)"
                    value={contenido.tarjeta.descripcion ?? ''}
                    onChange={(e) =>
                      actualizar({ tarjeta: { ...contenido.tarjeta, descripcion: e.target.value } })
                    }
                    maxLength={200}
                    error={campoError(errores, 'tarjeta.descripcion')}
                    disabled={deshabilitado}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tipo === 'tarjetas' && (
        <div className="flex flex-col gap-4">
          <CampoTexto
            etiqueta="Título de la sección (opcional)"
            value={contenido.titulo ?? ''}
            onChange={(e) => actualizar({ titulo: e.target.value })}
            maxLength={120}
            error={campoError(errores, 'titulo')}
            disabled={deshabilitado}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-ink">Tarjetas (1 a 12)</span>
              {campoError(errores, 'items') && (
                <p className="text-sm text-redParish">{campoError(errores, 'items')}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                const items = contenido.items ?? [];
                if (items.length >= 12) return;
                actualizar({
                  items: [
                    ...items,
                    { titulo: '', subtitulo: '', icono: '', url_imagen: '', texto_alternativo: '', enlace: '' },
                  ],
                });
              }}
              disabled={deshabilitado || (contenido.items?.length ?? 0) >= 12}
              className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone disabled:opacity-50"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar tarjeta
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {(contenido.items ?? []).map((item, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-cream/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Tarjeta {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (i === 0) return;
                        const copia = [...contenido.items];
                        [copia[i - 1], copia[i]] = [copia[i], copia[i - 1]];
                        actualizar({ items: copia });
                      }}
                      disabled={deshabilitado || i === 0}
                      aria-label={`Subir tarjeta ${i + 1}`}
                      className="rounded-md border border-borderSoft bg-white p-1.5 text-charcoal hover:bg-stone disabled:opacity-40"
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (i === contenido.items.length - 1) return;
                        const copia = [...contenido.items];
                        [copia[i + 1], copia[i]] = [copia[i], copia[i + 1]];
                        actualizar({ items: copia });
                      }}
                      disabled={deshabilitado || i === contenido.items.length - 1}
                      aria-label={`Bajar tarjeta ${i + 1}`}
                      className="rounded-md border border-borderSoft bg-white p-1.5 text-charcoal hover:bg-stone disabled:opacity-40"
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        actualizar({ items: contenido.items.filter((_, idx) => idx !== i) })
                      }
                      disabled={deshabilitado || contenido.items.length <= 1}
                      aria-label={`Quitar tarjeta ${i + 1}`}
                      className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:text-redParish disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoTexto
                    etiqueta={`Título de tarjeta ${i + 1}`}
                    value={item.titulo ?? ''}
                    onChange={(e) => {
                      const items = contenido.items.map((el, idx) =>
                        idx === i ? { ...el, titulo: e.target.value } : el,
                      );
                      actualizar({ items });
                    }}
                    maxLength={80}
                    error={campoError(errores, `items.${i}.titulo`)}
                    disabled={deshabilitado}
                  />
                  <CampoTexto
                    etiqueta={`Subtítulo de tarjeta ${i + 1} (opcional)`}
                    value={item.subtitulo ?? ''}
                    onChange={(e) => {
                      const items = contenido.items.map((el, idx) =>
                        idx === i ? { ...el, subtitulo: e.target.value } : el,
                      );
                      actualizar({ items });
                    }}
                    maxLength={300}
                    error={campoError(errores, `items.${i}.subtitulo`)}
                    disabled={deshabilitado}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectorIcono
                    etiqueta={`Ícono de tarjeta ${i + 1} (opcional)`}
                    valor={item.icono ?? ''}
                    onChange={(val) => {
                      const items = contenido.items.map((el, idx) =>
                        idx === i ? { ...el, icono: val } : el,
                      );
                      actualizar({ items });
                    }}
                    error={campoError(errores, `items.${i}.icono`)}
                    disabled={deshabilitado}
                  />
                  <CampoTexto
                    etiqueta={`Enlace de tarjeta ${i + 1} (opcional)`}
                    value={item.enlace ?? ''}
                    onChange={(e) => {
                      const items = contenido.items.map((el, idx) =>
                        idx === i ? { ...el, enlace: e.target.value } : el,
                      );
                      actualizar({ items });
                    }}
                    placeholder="#horarios o /paginas/..."
                    error={campoError(errores, `items.${i}.enlace`)}
                    disabled={deshabilitado}
                  />
                </div>

                <ImagenPreviewCampo
                  etiqueta={`Imagen de tarjeta ${i + 1} (opcional)`}
                  url={item.url_imagen ?? ''}
                  textoAlt={item.texto_alternativo ?? ''}
                  onElegir={() => onAbrirSelector({ destino: 'tarjeta', indice: i })}
                  onQuitar={() => {
                    const items = contenido.items.map((el, idx) =>
                      idx === i ? { ...el, url_imagen: '', texto_alternativo: '' } : el,
                    );
                    actualizar({ items });
                  }}
                  onChangeAlt={(val) => {
                    const items = contenido.items.map((el, idx) =>
                      idx === i ? { ...el, texto_alternativo: val } : el,
                    );
                    actualizar({ items });
                  }}
                  errorUrl={campoError(errores, `items.${i}.url_imagen`)}
                  errorAlt={campoError(errores, `items.${i}.texto_alternativo`)}
                  deshabilitado={deshabilitado}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tipo === 'cita' && (
        <div className="flex flex-col gap-4">
          <CampoArea
            etiqueta="Texto de la cita"
            value={contenido.texto ?? ''}
            onChange={(e) => actualizar({ texto: e.target.value })}
            maxLength={400}
            rows={3}
            ayuda="Sin comillas: el portal las agrega automáticamente."
            error={campoError(errores, 'texto')}
            disabled={deshabilitado}
          />
          <CampoTexto
            etiqueta="Autor o referencia (opcional)"
            value={contenido.autor ?? ''}
            onChange={(e) => actualizar({ autor: e.target.value })}
            maxLength={120}
            ayuda="Sin raya inicial: el portal la agrega automáticamente."
            error={campoError(errores, 'autor')}
            disabled={deshabilitado}
          />
        </div>
      )}

      {tipo === 'galeria' && (
        <div className="flex flex-col gap-4">
          <CampoTexto
            etiqueta="Título de la galería (opcional)"
            value={contenido.titulo ?? ''}
            onChange={(e) => actualizar({ titulo: e.target.value })}
            maxLength={120}
            error={campoError(errores, 'titulo')}
            disabled={deshabilitado}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-semibold text-ink">Imágenes (1 a 30)</span>
              {campoError(errores, 'imagenes') && (
                <p className="text-sm text-redParish">{campoError(errores, 'imagenes')}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAbrirSelector({ destino: 'galeria' })}
                disabled={deshabilitado || (contenido.imagenes?.length ?? 0) >= 30}
                className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-stone disabled:opacity-50"
              >
                <ImagePlus className="size-3.5" aria-hidden="true" />
                Agregar desde biblioteca
              </button>
              <button
                type="button"
                onClick={() => {
                  const imgs = contenido.imagenes ?? [];
                  if (imgs.length >= 30) return;
                  actualizar({
                    imagenes: [...imgs, { url: '', texto_alternativo: '', leyenda: '' }],
                  });
                }}
                disabled={deshabilitado || (contenido.imagenes?.length ?? 0) >= 30}
                className="flex items-center gap-1.5 rounded-md border border-borderSoft bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-stone disabled:opacity-50"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Agregar fila vacía
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {(contenido.imagenes ?? []).map((img, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-cream/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Imagen {i + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAbrirSelector({ destino: 'galeria', indice: i })}
                      disabled={deshabilitado}
                      className="rounded-md border border-borderSoft bg-white px-2.5 py-1 text-xs font-medium hover:bg-stone"
                    >
                      Elegir de biblioteca
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        actualizar({ imagenes: contenido.imagenes.filter((_, idx) => idx !== i) })
                      }
                      disabled={deshabilitado || contenido.imagenes.length <= 1}
                      aria-label={`Quitar imagen ${i + 1}`}
                      className="rounded-md border border-borderSoft bg-white p-1.5 text-muted hover:text-redParish disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {img.url && (
                  <img
                    src={img.url}
                    alt={img.texto_alternativo || `Imagen ${i + 1}`}
                    className="h-20 w-32 rounded-md border border-borderSoft object-cover"
                  />
                )}

                <CampoTexto
                  etiqueta={`URL de imagen ${i + 1}`}
                  value={img.url ?? ''}
                  onChange={(e) => {
                    const imagenes = contenido.imagenes.map((el, idx) =>
                      idx === i ? { ...el, url: e.target.value } : el,
                    );
                    actualizar({ imagenes });
                  }}
                  placeholder="/media/seed/..."
                  error={campoError(errores, `imagenes.${i}.url`)}
                  disabled={deshabilitado}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <CampoTexto
                    etiqueta={`Texto alternativo de imagen ${i + 1}`}
                    value={img.texto_alternativo ?? ''}
                    onChange={(e) => {
                      const imagenes = contenido.imagenes.map((el, idx) =>
                        idx === i ? { ...el, texto_alternativo: e.target.value } : el,
                      );
                      actualizar({ imagenes });
                    }}
                    maxLength={255}
                    error={campoError(errores, `imagenes.${i}.texto_alternativo`)}
                    disabled={deshabilitado}
                  />
                  <CampoTexto
                    etiqueta={`Leyenda de imagen ${i + 1} (opcional)`}
                    value={img.leyenda ?? ''}
                    onChange={(e) => {
                      const imagenes = contenido.imagenes.map((el, idx) =>
                        idx === i ? { ...el, leyenda: e.target.value } : el,
                      );
                      actualizar({ imagenes });
                    }}
                    maxLength={200}
                    error={campoError(errores, `imagenes.${i}.leyenda`)}
                    disabled={deshabilitado}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tipo === 'video_youtube' && (
        <div className="flex flex-col gap-4">
          <CampoTexto
            etiqueta="Enlace o identificador de YouTube"
            value={contenido.youtube_video_id ?? ''}
            onChange={(e) => actualizar({ youtube_video_id: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=... o ID de 11 caracteres"
            ayuda="Puedes pegar la URL completa de YouTube o su identificador de 11 caracteres."
            error={campoError(errores, 'youtube_video_id')}
            disabled={deshabilitado}
          />
          <CampoTexto
            etiqueta="Título accesible del video (opcional)"
            value={contenido.titulo ?? ''}
            onChange={(e) => actualizar({ titulo: e.target.value })}
            maxLength={160}
            error={campoError(errores, 'titulo')}
            disabled={deshabilitado}
          />
        </div>
      )}

    </>
  );
}
