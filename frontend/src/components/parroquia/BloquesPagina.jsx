import { ArrowRight } from 'lucide-react';

import { EtiquetaSeccion, TituloSeccion } from './ElementosComunes.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import EnlacePortal from './EnlacePortal.jsx';

export function BloqueHeroVideo({ contenido }) {
  if (!contenido?.titulo) return null;

  return (
    <section className="bloque-hero-subpagina">
      <div className="bloque-hero-medio">
        {contenido.url_video && (
          <video
            controls
            muted
            loop
            playsInline
            poster={contenido.url_poster || undefined}
            className="bloque-hero-video"
          >
            <source src={contenido.url_video} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="bloque-hero-texto">
        {contenido.etiqueta && <EtiquetaSeccion>{contenido.etiqueta}</EtiquetaSeccion>}
        <h2 className="serif-title subpagina-bloque-titulo">{contenido.titulo}</h2>
        {contenido.subtitulo && <p className="nosotros-descripcion">{contenido.subtitulo}</p>}

        {contenido.botones?.length > 0 && (
          <div className="bloque-hero-botones">
            {contenido.botones.map((boton, indice) => (
              <EnlacePortal
                key={boton.texto}
                to={boton.enlace}
                className={indice === 0 ? 'static-cta' : 'noticias-filtro-boton'}
              >
                {boton.texto}
                {indice === 0 && <ArrowRight size={16} aria-hidden="true" />}
              </EnlacePortal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function BloqueTextoImagen({ contenido, nivelTitulo = 'h2' }) {
  if (!contenido) return null;
  const parrafos = contenido.texto ? contenido.texto.split('\n\n') : [];
  const imagenALaDerecha = contenido.posicion_imagen === 'derecha';

  return (
    <div
      className={`nosotros-contenedor ${
        imagenALaDerecha ? 'bloque-texto-imagen-derecha' : ''
      }`}
    >
      <div className="nosotros-imagen-contenedor">
        <div className="nosotros-marco" />

        {contenido.url_imagen && (
          <img
            src={contenido.url_imagen}
            alt={contenido.texto_alternativo || contenido.titulo}
            className="nosotros-imagen"
            loading="lazy"
          />
        )}

        {contenido.tarjeta && (
          <div className="nosotros-tarjeta">
            {contenido.tarjeta.etiqueta && (
              <p className="nosotros-tarjeta-etiqueta">{contenido.tarjeta.etiqueta}</p>
            )}

            <p className="nosotros-tarjeta-titulo">{contenido.tarjeta.titulo}</p>

            {contenido.tarjeta.descripcion && (
              <p className="nosotros-tarjeta-descripcion">
                {contenido.tarjeta.descripcion}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="nosotros-informacion">
        <TituloSeccion
          overline={contenido.etiqueta || 'Quiénes somos'}
          title={contenido.titulo}
          as={nivelTitulo}
        />

        {parrafos.map((parrafo, indice) => (
          <p key={indice} className="nosotros-descripcion">
            {parrafo}
          </p>
        ))}
      </div>
    </div>
  );
}

export function BloqueCita({ contenido }) {
  if (!contenido?.texto) return null;

  return (
    <blockquote className="nosotros-cita">
      <p className="nosotros-cita-texto">“{contenido.texto}”</p>

      {contenido.autor && <cite className="nosotros-cita-autor">— {contenido.autor}</cite>}
    </blockquote>
  );
}

export function BloqueTarjetas({ contenido }) {
  const items = contenido?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="bloque-pagina">
      {contenido.titulo && (
        <h2 className="serif-title subpagina-bloque-titulo">{contenido.titulo}</h2>
      )}

      <div className="bloque-tarjetas-grilla">
        {items.map((item, indice) => {
          const cuerpo = (
            <>
              {item.url_imagen && (
                <img
                  src={item.url_imagen}
                  alt={item.texto_alternativo || item.titulo}
                  className="bloque-tarjeta-imagen"
                  loading="lazy"
                />
              )}

              {!item.url_imagen && item.icono && (
                <div className="bloque-tarjeta-icono">
                  <IconoDinamico nombre={item.icono} size={20} />
                </div>
              )}

              <div className="bloque-tarjeta-cuerpo">
                <h3 className="bloque-tarjeta-titulo">{item.titulo}</h3>
                {item.subtitulo && (
                  <p className="bloque-tarjeta-subtitulo">{item.subtitulo}</p>
                )}
              </div>
            </>
          );

          if (item.enlace) {
            return (
              <EnlacePortal
                key={`${item.titulo}-${indice}`}
                to={item.enlace}
                className="bloque-tarjeta bloque-tarjeta-enlace"
              >
                {cuerpo}
              </EnlacePortal>
            );
          }

          return (
            <article key={`${item.titulo}-${indice}`} className="bloque-tarjeta">
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
    <section className="bloque-pagina">
      {contenido.titulo && (
        <h2 className="serif-title subpagina-bloque-titulo">{contenido.titulo}</h2>
      )}

      <div className="bloque-galeria-grilla">
        {imagenes.map((imagen, indice) => (
          <figure key={`${imagen.url}-${indice}`} className="bloque-galeria-item">
            <img
              src={imagen.url}
              alt={imagen.texto_alternativo}
              className="bloque-galeria-imagen"
              loading="lazy"
            />
            {imagen.leyenda && (
              <figcaption className="bloque-galeria-leyenda">{imagen.leyenda}</figcaption>
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
    <section className="bloque-pagina">
      {contenido.titulo && (
        <h2 className="serif-title subpagina-bloque-titulo">{contenido.titulo}</h2>
      )}

      <div className="bloque-youtube-marco">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${contenido.youtube_video_id}`}
          title={contenido.titulo || 'Video de YouTube'}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="bloque-youtube-iframe"
        />
      </div>
    </section>
  );
}

export function RenderizadorBloquesPagina({ bloques = [] }) {
  const ordenados = [...bloques].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  return (
    <div className="bloques-pagina-lista">
      {ordenados.map((bloque) => {
        switch (bloque.tipo) {
          case 'hero_video':
            return <BloqueHeroVideo key={bloque.id} contenido={bloque.contenido} />;
          case 'texto_imagen':
            return (
              <div key={bloque.id} className="bloque-pagina">
                <BloqueTextoImagen contenido={bloque.contenido} />
              </div>
            );
          case 'cita':
            return (
              <div key={bloque.id} className="bloque-pagina">
                <BloqueCita contenido={bloque.contenido} />
              </div>
            );
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

