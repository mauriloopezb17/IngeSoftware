import { ArrowRight, Calendar } from 'lucide-react';

import EnlacePortal from '../EnlacePortal.jsx';
import { construirAtributosImagen } from '../imagenSrcSet.js';
import { formatearFechaLarga } from '../../../utils/formatoPortal.js';
import FragmentoResaltado from './FragmentoResaltado.jsx';

const ETIQUETAS_TIPO = {
  noticia: 'Noticia',
  evento: 'Evento',
  sacramento: 'Sacramento',
  grupo: 'Grupo pastoral',
  boletin: 'Boletín',
  pagina: 'Página',
};

function ResultadoBusqueda({ resultado }) {
  const { tipo, titulo, fragmento, url, fecha, imagen } = resultado;
  const etiquetaTipo = ETIQUETAS_TIPO[tipo] || tipo;
  const fechaTexto = fecha ? formatearFechaLarga(fecha) : null;
  const atributosImagen = imagen?.url ? construirAtributosImagen(imagen, 'miniatura') : null;

  return (
    <article className="group rounded-md border border-sand bg-white p-5 transition-colors duration-150 ease-salida hover:border-gold md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {atributosImagen && (
          <div className="h-24 w-full shrink-0 overflow-hidden rounded-sm border border-sand bg-cream sm:h-24 sm:w-32">
            <img
              {...atributosImagen}
              alt={imagen.textoAlternativo || ''}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 ease-salida group-hover:scale-105 motion-reduce:transition-none"
            />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-meta">
            <span className="inline-flex items-center rounded-sm bg-cream px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink">
              {etiquetaTipo}
            </span>
            {fechaTexto && (
              <span className="inline-flex items-center gap-1.5 text-muted">
                <Calendar size={14} aria-hidden="true" className="text-gold-dark" />
                <time dateTime={fecha}>{fechaTexto}</time>
              </span>
            )}
          </div>

          <h2 className="mt-1 font-display text-h3 font-semibold text-ink">
            <EnlacePortal
              to={url}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span>{titulo}</span>
              <ArrowRight
                size={16}
                aria-hidden="true"
                className="shrink-0 text-muted transition-transform duration-150 ease-salida group-hover:translate-x-1 group-hover:text-ink motion-reduce:transition-none"
              />
            </EnlacePortal>
          </h2>

          <FragmentoResaltado segmentos={fragmento} />
        </div>
      </div>
    </article>
  );
}

export default ResultadoBusqueda;
