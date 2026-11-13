import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { estaVacio } from './contenido.js';
import { formatearCampoFecha } from './fechas.js';

// BlockNote (solo lectura) se descarga únicamente al abrir la vista previa.
const ContenidoSoloLectura = lazy(() => import('./editor/ContenidoSoloLectura.jsx'));

// Vista previa de lo que se está escribiendo (aunque no esté guardado): título, portada, categoría, fechas y
// contenido tal como lo leerá el visitante. `campos`: los del formulario; `bloques`: editor.document.
export default function PreviaPublicacion({ campos, categoria, tipoNombre, bloques, onCerrar }) {
  const titulo = campos.titulo.trim();
  const publicacion = formatearCampoFecha(campos.fechaPublicacion);
  const expiracion = formatearCampoFecha(campos.fechaExpiracion);

  return (
    <Dialogo titulo="Vista previa" onCerrar={onCerrar} ancho="max-w-3xl">
      <p className="mb-4 rounded-md bg-goldPale px-3 py-2 text-xs text-goldDark">
        Así se verá el contenido. Es solo una aproximación: el portal puede variar el diseño. No se ha guardado nada.
      </p>

      <article className="flex flex-col gap-4">
        {campos.portada && (
          <img
            src={campos.portada.url}
            alt={campos.portada.textoAlternativo ?? ''}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <header className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-goldDark">
            <span>{tipoNombre}</span>
            {categoria && <span className="rounded-full bg-goldPale px-2 py-0.5">{categoria.nombre}</span>}
            {campos.destacada && <span className="rounded-full bg-gold/30 px-2 py-0.5">Destacada</span>}
          </p>
          <h2 className="font-serif text-3xl font-bold leading-tight text-ink">
            {titulo || <span className="text-muted">(Sin título)</span>}
          </h2>
          {campos.resumen.trim() && <p className="text-lg text-charcoal">{campos.resumen.trim()}</p>}
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
            <div className="flex gap-1">
              <dt>Publicación:</dt>
              <dd>{publicacion || 'se fijará al publicar'}</dd>
            </div>
            {expiracion && (
              <div className="flex gap-1">
                <dt>Expira:</dt>
                <dd>{expiracion}</dd>
              </div>
            )}
          </dl>
        </header>

        <Suspense
          fallback={
            <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando el contenido…
            </p>
          }
        >
          {!estaVacio(bloques) ? (
            <ContenidoSoloLectura bloques={bloques} />
          ) : (
            <p className="text-sm text-muted">Esta publicación todavía no tiene contenido.</p>
          )}
        </Suspense>

        {campos.urlExterna && (
          <p className="text-sm text-muted">
            Enlace externo: <span className="break-all text-ink">{campos.urlExterna}</span>
          </p>
        )}
      </article>

      <div className="mt-5 flex justify-end border-t border-borderSoft pt-4">
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-ink hover:bg-goldDark hover:text-white focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          Cerrar vista previa
        </button>
      </div>
    </Dialogo>
  );
}
