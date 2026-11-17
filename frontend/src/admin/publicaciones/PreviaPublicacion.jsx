import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import Dialogo from '../componentes/Dialogo.jsx';
import { Aviso, Boton, Insignia } from '../ui/index.js';
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
      <Aviso tipo="info" className="mb-4 text-xs">
        <p>
          Así se verá el contenido. Es solo una aproximación: el portal puede variar el diseño. No se ha guardado nada.
        </p>
      </Aviso>

      <article className="flex flex-col gap-4">
        {campos.portada && (
          <img
            src={campos.portada.url}
            alt={campos.portada.textoAlternativo ?? ''}
            className="aspect-video w-full rounded-lg object-cover"
          />
        )}

        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Insignia variante="borrador">{tipoNombre}</Insignia>
            {categoria && <Insignia variante="programado">{categoria.nombre}</Insignia>}
            {campos.destacada && <Insignia variante="revision">Destacada</Insignia>}
          </div>
          <h2 className="font-serif text-3xl font-bold leading-tight text-ink">
            {titulo || <span className="text-muted">(Sin título)</span>}
          </h2>
          {campos.resumen.trim() && <p className="text-base text-ink">{campos.resumen.trim()}</p>}
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
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando el contenido…
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

      <div className="mt-5 flex justify-end border-t border-sand pt-4">
        <Boton variante="primario" onClick={onCerrar}>
          Cerrar vista previa
        </Boton>
      </div>
    </Dialogo>
  );
}
