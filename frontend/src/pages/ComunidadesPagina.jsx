import { ArrowRight, MapPin } from 'lucide-react';

import {
  EncabezadoPagina,
  EncabezadoSeccion,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import {
  CargandoSeccion,
  ErrorSeccion,
  SinResultados,
} from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { SEDE_ACTUAL } from '../config/sede.js';
import { useArbolComunidades } from '../hooks/index.js';
import { enlaceComoLlegar } from '../utils/mapas.js';

function TarjetaSede({ sede, nivel = 3, retraso = 0 }) {
  const principal = sede.slug === SEDE_ACTUAL;
  const imagen = sede.imagenPortada;
  const hrefComoLlegar = enlaceComoLlegar(sede);
  const EtiquetaTitulo = `h${nivel}`;

  return (
    <Reveal
      variante="tarjeta"
      retraso={retraso}
      as="article"
      className={`tarjeta-portal group flex flex-col overflow-hidden rounded-md border bg-white ${
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
            alt={imagen.textoAlternativo || sede.nombre}
            width={imagen.ancho ?? undefined}
            height={imagen.alto ?? undefined}
            className="foto-hover aspect-[16/10] w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-4 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {sede.tipo?.nombre && (
              <span className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                {sede.tipo.nombre}
              </span>
            )}
            {principal && (
              <span className="rounded-sm bg-gold-soft px-2 py-0.5 font-body text-meta font-semibold text-ink">
                Sede actual
              </span>
            )}
          </div>

          <EtiquetaTitulo className="mt-2 font-display text-h3 font-semibold text-ink">
            {sede.nombre}
          </EtiquetaTitulo>

          {sede.direccion && (
            <p className="mt-2 flex items-start gap-1.5 font-body text-meta text-muted">
              <MapPin size={14} aria-hidden="true" className="mt-1 shrink-0" />
              <span>{sede.direccion}</span>
            </p>
          )}
        </div>

        {hrefComoLlegar && (
          <div className="border-t border-sand pt-3">
            <a
              href={hrefComoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Cómo llegar a ${sede.nombre} en Google Maps`}
              className="inline-flex min-h-11 items-center gap-1.5 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            >
              <span>Cómo llegar</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </Reveal>
  );
}

function ComunidadesPagina() {
  const { data: arbol, isPending, isError, refetch } = useArbolComunidades();

  const parroquias = arbol?.parroquias ?? [];
  const comunidadesPasionistas = arbol?.comunidadesPasionistas ?? [];

  return (
    <>
      <title>Nuestras comunidades | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Parroquias, capillas y comunidades organizadas por sede, junto a la comunidad pasionista en La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Nuestras comunidades' }]}
        eyebrow="Pasionistas en Bolivia"
        titulo="Nuestras comunidades"
        bajada="Parroquias, capillas y comunidades organizadas por sede, junto a la comunidad pasionista."
        variante="crema"
      />

      <Seccion id="parroquias-capillas" fondo="blanco">
        <EncabezadoSeccion
          eyebrow="Jurisdicción parroquial"
          titulo="Parroquias, capillas y comunidades"
          bajada="Cada parroquia reúne a sus capillas y comunidades según su ubicación y vida pastoral."
        />

        {isPending ? (
          <CargandoSeccion alturaMinima={280} etiqueta="Cargando parroquias, capillas y comunidades" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar las comunidades parroquiales."
            onReintentar={refetch}
          />
        ) : parroquias.length === 0 ? (
          <SinResultados mensaje="No hay parroquias disponibles por el momento." />
        ) : (
          <div className="flex flex-col gap-10">
            {parroquias.map((parroquia, indice) => {
              const capillas = parroquia.capillas ?? [];
              const comunidadesDirectas = parroquia.comunidades ?? [];
              const tieneDependientes = capillas.length > 0 || comunidadesDirectas.length > 0;

              return (
                <div key={parroquia.id} className="flex flex-col gap-4">
                  <div className="max-w-2xl">
                    <TarjetaSede sede={parroquia} nivel={3} retraso={indice * 90} />
                  </div>

                  {tieneDependientes && (
                    <div className="ml-4 flex flex-col gap-6 border-l-2 border-sand pl-4 md:ml-8 md:pl-6">
                      {capillas.length > 0 && (
                        <div className="flex flex-col gap-4">
                          {capillas.map((capilla, idxCapilla) => {
                            const comunidadesCapilla = capilla.comunidades ?? [];
                            return (
                              <div key={capilla.id} className="flex flex-col gap-4">
                                <div className="max-w-xl">
                                  <TarjetaSede
                                    sede={capilla}
                                    nivel={4}
                                    retraso={idxCapilla * 70}
                                  />
                                </div>

                                {comunidadesCapilla.length > 0 && (
                                  <div className="ml-4 grid grid-cols-1 gap-4 border-l-2 border-sand pl-4 md:ml-6 md:grid-cols-2 md:pl-6">
                                    {comunidadesCapilla.map((comunidad, idxCom) => (
                                      <TarjetaSede
                                        key={comunidad.id}
                                        sede={comunidad}
                                        nivel={5}
                                        retraso={idxCom * 60}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {comunidadesDirectas.length > 0 && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {comunidadesDirectas.map((comunidad, idxCom) => (
                            <TarjetaSede
                              key={comunidad.id}
                              sede={comunidad}
                              nivel={4}
                              retraso={idxCom * 60}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Seccion>

      <Seccion id="comunidad-pasionista" fondo="crema">
        <EncabezadoSeccion
          eyebrow="Misioneros Pasionistas"
          titulo="Comunidad pasionista"
          bajada="Comunidad religiosa de los Misioneros Pasionistas, entidad aparte de las parroquias y sus capillas."
        />

        {isPending ? (
          <CargandoSeccion alturaMinima={200} etiqueta="Cargando comunidad pasionista" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar la comunidad pasionista."
            onReintentar={refetch}
          />
        ) : comunidadesPasionistas.length === 0 ? (
          <SinResultados mensaje="No hay comunidades pasionistas registradas por el momento." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {comunidadesPasionistas.map((comunidad, indice) => (
              <TarjetaSede key={comunidad.id} sede={comunidad} nivel={3} retraso={indice * 90} />
            ))}
          </div>
        )}
      </Seccion>
    </>
  );
}

export default ComunidadesPagina;
