import { ScrollText } from 'lucide-react';

import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Seccion,
} from '../portal/index.js';
import EnlacePortal from '../portal/EnlacePortal.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { construirAtributosImagen } from './imagenSrcSet.js';
import { useProclamas } from '../../hooks/index.js';
import { formatearFechaBoda } from '../../utils/formatoPortal.js';

function Proclamas() {
  const { data: proclamas = [], isPending, isError, refetch } = useProclamas();

  return (
    <Seccion id="proclamas" fondo="blanco">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <span className="mb-4 inline-flex size-11 items-center justify-center rounded-sm bg-gold-soft text-ink">
            <ScrollText size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>

          <EncabezadoSeccion
            eyebrow="Proclamas matrimoniales"
            titulo="Quieren unirse en el sacramento del matrimonio"
            bajada="Si alguien conoce algún impedimento por el cual estas parejas no puedan contraer matrimonio, está obligado a comunicarlo al párroco o en secretaría."
            className="mb-6"
          />

          <EnlaceFlecha to="/proclamas">Ver historial de proclamas</EnlaceFlecha>
        </div>

        <div id="proclamas-listado" className="lg:col-span-7">
          {isPending ? (
            <CargandoSeccion alturaMinima={240} etiqueta="Cargando proclamas matrimoniales" />
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos cargar las proclamas matrimoniales."
              onReintentar={refetch}
            />
          ) : proclamas.length === 0 ? (
            <SinResultados mensaje="No hay proclamas vigentes esta semana." />
          ) : (
            <div className="rounded-md border border-sand bg-cream p-6 md:p-8">
              <ul className="divide-y divide-sand">
                {proclamas.map(
                  ({ id, contrayente1, contrayente2, fechaMatrimonio, numeroProclama, imagen }) => (
                    <li
                      key={id}
                      className="group relative flex flex-col gap-3 rounded-sm py-5 first:pt-0 last:pb-0 focus-within:ring-2 focus-within:ring-gold focus-within:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        {imagen && (
                          <div className="size-14 shrink-0 overflow-hidden rounded-sm border border-sand bg-white">
                            <img
                              {...construirAtributosImagen(imagen, '56px')}
                              alt=""
                              aria-hidden="true"
                              className="size-full object-cover transition-transform duration-700 ease-salida group-hover:scale-[1.06] motion-reduce:transition-none"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-display text-h3 font-semibold text-ink">
                            <EnlacePortal
                              to={`/proclamas/${id}`}
                              className="after:absolute after:inset-0 focus-visible:outline-none"
                            >
                              {`${contrayente1} & ${contrayente2}`}
                            </EnlacePortal>
                          </h3>
                          <p className="mt-1 font-body text-meta text-muted">
                            {formatearFechaBoda(fechaMatrimonio)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end">
                        <span className="inline-flex w-fit items-center rounded-sm bg-gold-soft px-3 py-1 font-body text-meta font-semibold text-ink">
                          {`${numeroProclama}.ª proclama`}
                        </span>
                        <span
                          aria-hidden="true"
                          className="font-body text-meta font-semibold text-ink transition-transform duration-200 ease-salida group-hover:translate-x-1 motion-reduce:transition-none"
                        >
                          Ver proclama →
                        </span>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Seccion>
  );
}

export default Proclamas;
