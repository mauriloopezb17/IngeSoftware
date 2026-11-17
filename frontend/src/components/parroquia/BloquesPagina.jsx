import { ArrowRight } from 'lucide-react';

import {
  BotonEnlace,
  EncabezadoSeccion,
  Eyebrow,
  Reveal,
} from '../portal/index.js';
import EnlacePortal from './EnlacePortal.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';

export function BloqueHeroVideo({ contenido }) {
  if (!contenido?.titulo) return null;

  return (
    <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {contenido.url_video && (
          <video
            controls
            muted
            loop
            playsInline
            poster={contenido.url_poster || undefined}
            className="aspect-video w-full rounded-md border border-sand bg-ink"
          >
            <source src={contenido.url_video} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="lg:col-span-5">
        {contenido.etiqueta && <Eyebrow className="mb-4">{contenido.etiqueta}</Eyebrow>}
        <h2 className="font-display text-h2 font-semibold text-ink">{contenido.titulo}</h2>
        {contenido.subtitulo && (
          <p className="mt-4 max-w-prose font-body text-body text-muted">{contenido.subtitulo}</p>
        )}

        {contenido.botones?.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {contenido.botones.map((boton, indice) => (
              <BotonEnlace
                key={boton.texto}
                to={boton.enlace}
                variante={indice === 0 ? 'primario' : 'secundario'}
              >
                <span>{boton.texto}</span>
                {indice === 0 && <ArrowRight size={16} aria-hidden="true" />}
              </BotonEnlace>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function BloqueTextoImagen({ contenido }) {
  if (!contenido) return null;
  const parrafos = contenido.texto ? contenido.texto.split('\n\n') : [];
  const imagenALaDerecha = contenido.posicion_imagen === 'derecha';

  return (
    <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
      {contenido.url_imagen && (
        <Reveal
          variante={imagenALaDerecha ? 'derecha' : 'izquierda'}
          className={`lg:col-span-6 ${imagenALaDerecha ? 'lg:order-2' : ''}`}
        >
          <div className="overflow-hidden rounded-md border border-sand bg-cream">
            <img
              src={contenido.url_imagen}
              alt={contenido.texto_alternativo || contenido.titulo}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            {contenido.tarjeta && (
              <div className="border-t border-sand px-6 py-4">
                {contenido.tarjeta.etiqueta && (
                  <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                    {contenido.tarjeta.etiqueta}
                  </p>
                )}
                <p className="mt-1 font-display text-h3 font-semibold text-ink">
                  {contenido.tarjeta.titulo}
                </p>
                {contenido.tarjeta.descripcion && (
                  <p className="mt-1 font-body text-meta text-muted">
                    {contenido.tarjeta.descripcion}
                  </p>
                )}
              </div>
            )}
          </div>
        </Reveal>
      )}

      <div
        className={`${contenido.url_imagen ? 'lg:col-span-6' : 'lg:col-span-10'} ${
          imagenALaDerecha ? 'lg:order-1' : ''
        }`}
      >
        <EncabezadoSeccion
          eyebrow={contenido.etiqueta || 'Quiénes somos'}
          titulo={contenido.titulo}
          className="mb-6"
        />

        <div className="space-y-4">
          {parrafos.map((parrafo, indice) => (
            <p key={indice} className="max-w-prose font-body text-body text-muted">
              {parrafo}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BloqueCita({ contenido }) {
  if (!contenido?.texto) return null;

  return (
    <blockquote className="max-w-prose border-l-2 border-gold pl-6">
      <p className="font-display text-h2 italic text-ink">“{contenido.texto}”</p>

      {contenido.autor && (
        <footer className="mt-3 font-body text-meta text-muted">— {contenido.autor}</footer>
      )}
    </blockquote>
  );
}

export function BloqueTarjetas({ contenido }) {
  const items = contenido?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      {contenido.titulo && (
        <h2 className="mb-8 font-display text-h2 font-semibold text-ink">{contenido.titulo}</h2>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, indice) => {
          const cuerpo = (
            <>
              {item.url_imagen && (
                <img
                  src={item.url_imagen}
                  alt={item.texto_alternativo || item.titulo}
                  className="aspect-[16/10] w-full rounded-sm object-cover"
                  loading="lazy"
                />
              )}

              {!item.url_imagen && item.icono && (
                <span className="inline-flex size-11 items-center justify-center rounded-sm bg-gold-soft text-ink">
                  <IconoDinamico nombre={item.icono} size={20} />
                </span>
              )}

              <div>
                <h3 className="font-display text-h3 font-semibold text-ink">{item.titulo}</h3>
                {item.subtitulo && (
                  <p className="mt-2 font-body text-body text-muted">{item.subtitulo}</p>
                )}
              </div>
            </>
          );

          if (item.enlace) {
            return (
              <EnlacePortal
                key={`${item.titulo}-${indice}`}
                to={item.enlace}
                className="flex flex-col gap-4 rounded-md border border-sand bg-cream p-6 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {cuerpo}
              </EnlacePortal>
            );
          }

          return (
            <article
              key={`${item.titulo}-${indice}`}
              className="flex flex-col gap-4 rounded-md border border-sand bg-cream p-6"
            >
              {cuerpo}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function BloqueGaleria({ contenido }) {
  const imagenes = contenido?.imagenes ?? [];
  if (imagenes.length === 0) return null;

  return (
    <section>
      {contenido.titulo && (
        <h2 className="mb-8 font-display text-h2 font-semibold text-ink">{contenido.titulo}</h2>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {imagenes.map((imagen, indice) => (
          <figure key={`${imagen.url}-${indice}`} className="group">
            <div className="overflow-hidden rounded-md border border-sand bg-cream">
              <img
                src={imagen.url}
                alt={imagen.texto_alternativo}
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                loading="lazy"
              />
            </div>
            {imagen.leyenda && (
              <figcaption className="mt-2 font-body text-meta text-muted">
                {imagen.leyenda}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}

export function BloqueVideoYoutube({ contenido }) {
  if (!contenido?.youtube_video_id) return null;

  return (
    <section>
      {contenido.titulo && (
        <h2 className="mb-8 font-display text-h2 font-semibold text-ink">{contenido.titulo}</h2>
      )}

      <div className="overflow-hidden rounded-md border border-sand bg-ink">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${contenido.youtube_video_id}`}
          title={contenido.titulo || 'Video de YouTube'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full border-0"
        />
      </div>
    </section>
  );
}

export function RenderizadorBloquesPagina({ bloques = [] }) {
  const ordenados = [...bloques].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  return (
    <div className="flex flex-col gap-16">
      {ordenados.map((bloque) => {
        switch (bloque.tipo) {
          case 'hero_video':
            return <BloqueHeroVideo key={bloque.id} contenido={bloque.contenido} />;
          case 'texto_imagen':
            return <BloqueTextoImagen key={bloque.id} contenido={bloque.contenido} />;
          case 'cita':
            return <BloqueCita key={bloque.id} contenido={bloque.contenido} />;
          case 'tarjetas':
            return <BloqueTarjetas key={bloque.id} contenido={bloque.contenido} />;
          case 'galeria':
            return <BloqueGaleria key={bloque.id} contenido={bloque.contenido} />;
          case 'video_youtube':
            return <BloqueVideoYoutube key={bloque.id} contenido={bloque.contenido} />;
          default:
            // Los bloques de tipo desconocido se ignoran sin fallar (docs/api/publico.md).
            return null;
        }
      })}
    </div>
  );
}
