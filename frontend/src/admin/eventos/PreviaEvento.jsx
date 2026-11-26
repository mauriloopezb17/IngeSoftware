import { lazy, Suspense } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { estaVacio } from '../publicaciones/contenido.js';
import { Aviso, Boton, Insignia } from '../ui/index.js';
import { detalleDe, fechasDe } from './campos.js';
import { formatearCuandoEvento } from './formato.js';

const ContenidoSoloLectura = lazy(() => import('../publicaciones/editor/ContenidoSoloLectura.jsx'));

// Vista previa de la página del evento (especialmente útil para borradores o cambios sin guardar).
export default function PreviaEvento({ campos, categoria, bloques, publicadoUrl, onCerrar }) {
  const titulo = campos.titulo.trim();
  const fechas = fechasDe(campos);
  const detalle = detalleDe(campos, bloques);
  const cuando = fechas.fechaInicio
    ? formatearCuandoEvento({
        fechaInicio: fechas.fechaInicio,
        fechaFin: fechas.fechaFin,
        todoElDia: campos.todoElDia,
      })
    : 'Fecha por definir';

  return (
    <Dialogo titulo="Vista previa" onCerrar={onCerrar} ancho="max-w-3xl">
      <Aviso tipo="info" className="mb-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>Así se verá el evento al abrirlo en el portal (aproximación sin guardar).</p>
          {publicadoUrl && (
            <a
              href={publicadoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-ink underline"
            >
              Ver versión publicada <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </Aviso>

      <article className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          {categoria && (
            <div>
              <Insignia variante="borrador">{categoria.nombre}</Insignia>
            </div>
          )}
          <h2 className="font-serif text-3xl font-bold leading-tight text-ink">
            {titulo || <span className="text-muted">(Sin título)</span>}
          </h2>
          {campos.descripcion.trim() && <p className="text-base text-muted">{campos.descripcion.trim()}</p>}
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
            <div className="flex gap-1.5">
              <dt className="font-semibold">Cuándo:</dt>
              <dd>{cuando}</dd>
            </div>
            {campos.lugar.trim() && (
              <div className="flex gap-1.5">
                <dt className="font-semibold">Lugar:</dt>
                <dd>{campos.lugar.trim()}</dd>
              </div>
            )}
            {detalle?.direccion && (
              <div className="flex gap-1.5">
                <dt className="font-semibold">Dirección:</dt>
                <dd>{detalle.direccion}</dd>
              </div>
            )}
          </dl>
          {detalle?.enlaceMapa && (
            <p className="text-sm">
              <a
                href={detalle.enlaceMapa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-ink underline"
              >
                Cómo llegar en Google Maps <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </p>
          )}
        </header>

        {campos.imagen && (
          <img
            src={campos.imagen.url}
            alt={campos.imagen.textoAlternativo ?? ''}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <Suspense
          fallback={
            <p role="status" className="flex items-center gap-2 py-4 text-sm text-muted">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando el contenido…
            </p>
          }
        >
          {!estaVacio(bloques) ? (
            <ContenidoSoloLectura bloques={bloques} />
          ) : (
            <p className="text-sm text-muted">Este evento no tiene descripción enriquecida todavía.</p>
          )}
        </Suspense>

        {detalle?.programa?.length > 0 && (
          <section className="rounded-md border border-sand bg-panel p-4">
            <h3 className="text-sm font-semibold text-ink">Programa</h3>
            <ul className="mt-2 divide-y divide-sand text-sm">
              {detalle.programa.map((item, indice) => (
                <li key={`${indice}-${item.hora}`} className="flex gap-3 py-1.5">
                  <span className="w-14 shrink-0 font-semibold tabular-nums text-ink">{item.hora}</span>
                  <span className="text-ink">{item.actividad}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {detalle?.responsable && (
          <section className="rounded-md border border-sand bg-panel p-4 text-sm">
            <h3 className="font-semibold text-ink">Responsable</h3>
            <p className="mt-1 text-ink">
              {detalle.responsable.nombre}
              {detalle.responsable.rol && ` · ${detalle.responsable.rol}`}
            </p>
            {(detalle.responsable.telefono || detalle.responsable.correo) && (
              <p className="mt-1 text-muted">
                {[detalle.responsable.telefono, detalle.responsable.correo].filter(Boolean).join(' · ')}
              </p>
            )}
          </section>
        )}

        {detalle?.enlaces?.length > 0 && (
          <section className="rounded-md border border-sand bg-panel p-4 text-sm">
            <h3 className="font-semibold text-ink">Enlaces</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {detalle.enlaces.map((item, indice) => (
                <li key={`${indice}-${item.url}`}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-ink underline"
                  >
                    {item.texto} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <div className="mt-5 flex justify-end border-t border-sand pt-4">
        <Boton variante="primario" onClick={onCerrar}>
          Cerrar vista previa
        </Boton>
      </div>
    </Dialogo>
  );
}
