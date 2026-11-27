import { ArrowRight } from 'lucide-react';
import { Link, useInRouterContext } from 'react-router';

import { BotonEnlace, EncabezadoSeccion, Reveal, Seccion } from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { useGruposPastorales } from '../../hooks/index.js';

function GruposPastorales() {
  const { data: grupos = [], isPending, isError, refetch } = useGruposPastorales();
  const enRouter = useInRouterContext();

  return (
    <Seccion id="comunidad" fondo="crema">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <EncabezadoSeccion
            eyebrow="Comunidad"
            titulo="Grupos y pastorales"
            bajada="Hay un lugar para ti. Niños, jóvenes, familias y adultos mayores encuentran aquí un espacio para servir, formarse y crecer en la fe."
            className="mb-6"
          />

          <BotonEnlace to="/contacto" variante="primario">
            <span>Quiero participar</span>
            <ArrowRight size={16} aria-hidden="true" />
          </BotonEnlace>
        </div>

        <div className="lg:col-span-7">
          {isPending ? (
            <CargandoSeccion alturaMinima={240} etiqueta="Cargando grupos pastorales" />
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos cargar los grupos pastorales."
              onReintentar={refetch}
            />
          ) : grupos.length === 0 ? (
            <SinResultados mensaje="No hay grupos pastorales publicados por el momento." />
          ) : (
            <Reveal variante="tarjeta">
              <ul className="divide-y divide-sand rounded-md border border-sand bg-white px-6">
                {grupos.map(({ id, slug, nombre, horarioReunion, icono }) => (
                  <li
                    key={id}
                    className="group relative flex flex-wrap items-center justify-between gap-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                        <IconoDinamico nombre={icono} size={18} strokeWidth={1.8} />
                      </span>
                      <h3 className="font-display text-h3 font-semibold text-ink">
                        {enRouter ? (
                          <Link
                            to={`/comunidad/grupos/${slug}`}
                            className="inline-flex min-h-11 items-center after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            {nombre}
                          </Link>
                        ) : (
                          <a
                            href={`/comunidad/grupos/${slug}`}
                            className="inline-flex min-h-11 items-center after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                          >
                            {nombre}
                          </a>
                        )}
                      </h3>
                    </div>

                    <div className="flex items-center gap-4">
                      {horarioReunion && (
                        <p className="font-body text-meta text-muted">{horarioReunion}</p>
                      )}
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center gap-1 font-body text-meta font-semibold text-ink transition-transform duration-200 ease-salida group-hover:translate-x-1"
                      >
                        <span className="hidden sm:inline">Conocer el grupo</span>
                        <ArrowRight size={15} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>
    </Seccion>
  );
}

export default GruposPastorales;
