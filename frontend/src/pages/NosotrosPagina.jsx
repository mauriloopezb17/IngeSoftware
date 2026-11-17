import { useState } from 'react';
import { Clapperboard, ExternalLink, MapPin, Play } from 'lucide-react';

import {
  Boton,
  BotonEnlace,
  EncabezadoPagina,
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import ModalVideo from '../components/portal/ModalVideo.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { construirAtributosImagen } from '../components/parroquia/imagenSrcSet.js';
import { SEDE_ACTUAL } from '../config/sede.js';
import { useComunidades, useMenuPaginas, usePagina, useSede, useVideos } from '../hooks/index.js';

function NosotrosPagina() {
  const { data: pagina, isPending, isError, refetch } = usePagina('nosotros');
  const { data: paginaInicio } = usePagina('inicio');
  const { data: comunidades = [], isPending: cargandoComunidades } = useComunidades();
  const { data: sede } = useSede();
  const { data: videos = [] } = useVideos();
  const { data: paginasMenu = [] } = useMenuPaginas();
  const [modalVideoAbierto, setModalVideoAbierto] = useState(false);

  const bloques = pagina?.bloques ?? [];
  const textoImagen = bloques.find((bloque) => bloque.tipo === 'texto_imagen')?.contenido;
  const cita = bloques.find((bloque) => bloque.tipo === 'cita')?.contenido;
  const parroco = bloques.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items?.[0];
  const parrafos = textoImagen?.texto ? textoImagen.texto.split('\n\n') : [];

  const hero = paginaInicio?.bloques?.find((bloque) => bloque.tipo === 'hero_video')?.contenido;
  const videoYoutube = videos[0] ?? null;
  const tieneHistoria = paginasMenu.some((item) => item.slug === 'historia');

  return (
    <>
      <title>Nosotros | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Historia, carisma de los Padres Pasionistas, el párroco y nuestras comunidades en Obrajes, La Paz."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Nosotros' }]}
        eyebrow="Padres Pasionistas · Obrajes"
        titulo="Quiénes somos"
        bajada={
          sede?.configuracion?.descripcionPie ||
          'Parroquia confiada a la Congregación de la Pasión de Jesucristo (Pasionistas) en el sur de La Paz.'
        }
        variante={sede?.imagenPortada?.url ? 'foto' : 'crema'}
        imagen={sede?.imagenPortada}
      />

      {/* Historia y carisma */}
      <Seccion fondo="blanco">
        {isPending ? (
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando información de la parroquia" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar la información de nuestra parroquia."
            onReintentar={refetch}
          />
        ) : !textoImagen && !cita && !parroco ? (
          <SinResultados mensaje="No hay información disponible en esta sección." />
        ) : (
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            {textoImagen?.url_imagen && (
              <Reveal variante="izquierda" className="lg:col-span-6">
                <div className="relative overflow-hidden rounded-md border border-sand">
                  <img
                    src={textoImagen.url_imagen}
                    alt={textoImagen.texto_alternativo || textoImagen.titulo}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                  {textoImagen.tarjeta && (
                    <div className="border-t border-sand bg-cream p-5">
                      {textoImagen.tarjeta.etiqueta && (
                        <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                          {textoImagen.tarjeta.etiqueta}
                        </p>
                      )}
                      <p className="mt-1 font-display text-h3 font-semibold text-ink">
                        {textoImagen.tarjeta.titulo}
                      </p>
                      {textoImagen.tarjeta.descripcion && (
                        <p className="mt-1 font-body text-meta text-muted">
                          {textoImagen.tarjeta.descripcion}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            )}

            <div className={textoImagen?.url_imagen ? 'lg:col-span-6' : 'lg:col-span-10'}>
              {textoImagen && (
                <>
                  <EncabezadoSeccion
                    eyebrow={textoImagen.etiqueta || 'Nuestra misión'}
                    titulo={textoImagen.titulo}
                    className="mb-6"
                  />

                  <div className="space-y-4">
                    {parrafos.map((parrafo, indice) => (
                      <p key={indice} className="max-w-prose font-body text-body text-muted">
                        {parrafo}
                      </p>
                    ))}
                  </div>
                </>
              )}

              {cita?.texto && (
                <blockquote className="mt-8 border-l-2 border-gold pl-6">
                  <p className="font-display text-h3 italic text-ink">“{cita.texto}”</p>
                  {cita.autor && (
                    <footer className="mt-2 font-body text-meta text-muted">— {cita.autor}</footer>
                  )}
                </blockquote>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-sand pt-6">
                {parroco && (
                  <div className="flex items-center gap-4">
                    {parroco.url_imagen && (
                      <img
                        src={parroco.url_imagen}
                        alt={parroco.texto_alternativo || parroco.titulo}
                        width={64}
                        height={64}
                        className="size-16 rounded-full border border-sand object-cover"
                        loading="lazy"
                      />
                    )}
                    <div>
                      <p className="font-display text-h3 font-semibold text-ink">
                        {parroco.titulo}
                      </p>
                      {parroco.subtitulo && (
                        <p className="font-body text-meta text-muted">{parroco.subtitulo}</p>
                      )}
                    </div>
                  </div>
                )}

                {tieneHistoria && (
                  <EnlaceFlecha to="/paginas/historia">Leer nuestra historia</EnlaceFlecha>
                )}
              </div>
            </div>
          </div>
        )}
      </Seccion>

      {/* Video institucional */}
      {(videoYoutube || hero?.url_video) && (
        <Seccion id="video-institucional" fondo="tinta">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <EncabezadoSeccion
                oscuro
                eyebrow="Recorrido por el templo"
                titulo="Un vistazo a nuestra parroquia"
                bajada="Conoce nuestra casa de oración en Obrajes, los espacios de celebración y el templo parroquial."
                className="mb-6"
              />

              {!videoYoutube && hero?.url_video && (
                <Boton
                  variante="primarioOscuro"
                  onClick={() => setModalVideoAbierto(true)}
                >
                  <Play size={16} aria-hidden="true" />
                  Ver video completo con sonido
                </Boton>
              )}
            </div>

            <div className="lg:col-span-7">
              {videoYoutube ? (
                <div className="overflow-hidden rounded-md border border-white/15 bg-ink-soft">
                  <iframe
                    className="aspect-video w-full"
                    src={videoYoutube.urlInsercion}
                    title={videoYoutube.titulo || 'Video institucional'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-md border border-white/15 bg-ink-soft">
                  <img
                    src={hero.url_poster || '/media/seed/altar.webp'}
                    alt="Vista del templo de la Parroquia Señor de la Exaltación"
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-meta text-muted-on-dark">
                    <span className="inline-flex items-center gap-2">
                      <Clapperboard size={16} aria-hidden="true" className="text-gold" />
                      {hero.detalle_video || 'Recorrido aéreo · 0:30'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalVideoAbierto(true)}
                      className="cursor-pointer font-semibold text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      Reproducir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!videoYoutube && hero?.url_video && (
            <ModalVideo
              abierto={modalVideoAbierto}
              alCerrar={() => setModalVideoAbierto(false)}
              urlVideo={hero.url_video}
              titulo={hero.texto_video || 'Video institucional'}
            />
          )}
        </Seccion>
      )}

      {/* Sedes y comunidades */}
      <Seccion id="comunidades" fondo="crema">
        <EncabezadoSeccion
          eyebrow="Pasionistas en La Paz"
          titulo="Nuestras sedes y comunidades"
          bajada="Caminamos en comunión con las comunidades pasionistas y capillas hermanas."
        />

        {cargandoComunidades ? (
          <CargandoSeccion alturaMinima={220} etiqueta="Cargando sedes y comunidades" />
        ) : comunidades.length === 0 ? (
          <SinResultados mensaje="No hay comunidades disponibles por el momento." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {comunidades.map((comunidad, indice) => {
              const principal = comunidad.slug === SEDE_ACTUAL;
              const imagen = comunidad.imagenPortada;
              return (
                <Reveal
                  key={comunidad.id}
                  variante="tarjeta"
                  retraso={indice * 90}
                  as="article"
                  className="flex flex-col overflow-hidden rounded-md border border-sand bg-white"
                >
                  {imagen?.url && (
                    <div className="overflow-hidden">
                      <img
                        src={imagen.url}
                        {...construirAtributosImagen(imagen, '(min-width: 768px) 33vw, 100vw')}
                        alt={imagen.textoAlternativo || comunidad.nombre}
                        width={imagen.ancho ?? undefined}
                        height={imagen.alto ?? undefined}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.04]"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {comunidad.tipo?.nombre && (
                          <span className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                            {comunidad.tipo.nombre}
                          </span>
                        )}
                        {principal && (
                          <span className="rounded-sm bg-gold-soft px-2 py-0.5 font-body text-meta font-semibold text-ink">
                            Sede actual
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2 font-display text-h3 font-semibold text-ink">
                        {comunidad.nombre}
                      </h3>

                      {comunidad.direccion && (
                        <p className="mt-2 flex items-start gap-2 font-body text-meta text-muted">
                          <MapPin size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                          <span>{comunidad.direccion}</span>
                        </p>
                      )}
                    </div>

                    {comunidad.enlaceComoLlegar && (
                      <div className="mt-5 pt-4 border-t border-sand">
                        <BotonEnlace to={comunidad.enlaceComoLlegar} variante="secundario">
                          Cómo llegar
                          <ExternalLink size={15} aria-hidden="true" />
                        </BotonEnlace>
                      </div>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </Seccion>
    </>
  );
}

export default NosotrosPagina;
