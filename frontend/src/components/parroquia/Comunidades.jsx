import { ArrowRight, MapPin } from 'lucide-react';

import { EncabezadoSeccion, Seccion } from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { SEDE_ACTUAL } from '../../config/sede.js';
import { useComunidades } from '../../hooks/index.js';
import { construirAtributosImagen } from './imagenSrcSet.js';

function formatearNombreComunidad(comunidad) {
  const nombre = comunidad?.nombre ?? '';
  const tipo = comunidad?.tipo?.nombre?.trim();
  if (!tipo) return nombre;

  const prefijo = `${tipo} `;
  if (nombre.toLowerCase().startsWith(prefijo.toLowerCase())) {
    return nombre.slice(prefijo.length).trimStart();
  }
  return nombre;
}

function Comunidades() {
  const { data: comunidades = [], isPending, isError, refetch } = useComunidades();

  return (
    <Seccion id="comunidades" fondo="crema">
      <EncabezadoSeccion
        eyebrow="Pasionistas en Bolivia"
        titulo="Nuestras comunidades"
        bajada="Una sola familia pasionista. Cada sede tiene su propio espacio dentro de pasionistas.org.bo."
      />

      {isPending ? (
        <CargandoSeccion alturaMinima={320} etiqueta="Cargando comunidades" />
      ) : isError ? (
        <ErrorSeccion mensaje="No pudimos cargar las comunidades." onReintentar={refetch} />
      ) : comunidades.length === 0 ? (
        <SinResultados mensaje="No hay comunidades disponibles por el momento." />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {comunidades.map((comunidad) => {
            const principal = comunidad.slug === SEDE_ACTUAL;
            const imagen = comunidad.imagenPortada;

            return (
              <article
                key={comunidad.id}
                className={`flex flex-col overflow-hidden rounded-md border bg-white ${
                  principal ? 'border-gold' : 'border-sand'
                }`}
              >
                {imagen && (
                  <div className="overflow-hidden bg-cream">
                    <img
                      src={imagen.url}
                      {...construirAtributosImagen(
                        imagen,
                        '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
                      )}
                      alt={imagen.textoAlternativo || comunidad.nombre}
                      width={imagen.ancho ?? undefined}
                      height={imagen.alto ?? undefined}
                      className="aspect-[16/10] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    {comunidad.tipo?.nombre && (
                      <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                        {comunidad.tipo.nombre}
                      </p>
                    )}

                    <h3 className="mt-2 font-display text-h3 font-semibold text-ink">
                      {formatearNombreComunidad(comunidad)}
                    </h3>

                    {comunidad.direccion && (
                      <p className="mt-2 flex items-start gap-1.5 font-body text-meta text-muted">
                        <MapPin size={14} aria-hidden="true" className="mt-1 shrink-0" />
                        <span>{comunidad.direccion}</span>
                      </p>
                    )}
                  </div>

                  {comunidad.enlaceComoLlegar && (
                    <div className="mt-4 pt-3 border-t border-sand">
                      <a
                        href={comunidad.enlaceComoLlegar}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Cómo llegar a ${comunidad.nombre} en Google Maps`}
                        className="inline-flex min-h-11 items-center gap-1.5 font-body text-button font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        <span>Cómo llegar</span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Seccion>
  );
}

export default Comunidades;
