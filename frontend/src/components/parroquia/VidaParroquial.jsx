import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { usePublicaciones } from '../../hooks/index.js';
import { formatearFechaLarga } from '../../utils/formatoPortal.js';
import { construirAtributosImagen } from './imagenSrcSet.js';

import '../../styles/VidaParroquial.css';

function VidaParroquial() {
  const [indiceActivo, setIndiceActivo] = useState(0);
  const { data, isPending, isError, refetch } = usePublicaciones({
    tipo: 'NOTICIA,NOTA_DE_PRENSA',
    porPagina: 3,
  });

  const noticias = data?.datos ?? [];
  const totalNoticias = noticias.length;

  const cambiarNoticia = (direccion) => {
    if (totalNoticias <= 1) return;
    setIndiceActivo((actual) => (actual + direccion + totalNoticias) % totalNoticias);
  };

  const noticiasVisibles = noticias.map((_, posicion) => {
    const indice = (indiceActivo + posicion) % totalNoticias;
    return noticias[indice];
  });

  return (
    <section id="noticias" className="vida-parroquial">
      <div className={anchoContenido}>
        <div className="vida-parroquial-encabezado">
          <div>
            <p className="eyebrow">Noticias y notas de prensa</p>

            <h2 className="serif-title vida-parroquial-titulo">Vida parroquial</h2>
          </div>

          <div className="vida-parroquial-controles">
            <button
              type="button"
              className="vida-parroquial-control"
              onClick={() => cambiarNoticia(-1)}
              aria-label="Ver noticias anteriores"
              disabled={totalNoticias <= 1}
            >
              <ChevronLeft size={19} />
            </button>

            <button
              type="button"
              className="vida-parroquial-control vida-parroquial-control-activo"
              onClick={() => cambiarNoticia(1)}
              aria-label="Ver noticias siguientes"
              disabled={totalNoticias <= 1}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>

        {isPending ? (
          <CargandoSeccion alturaMinima={420} etiqueta="Cargando noticias de vida parroquial" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar las noticias de vida parroquial."
            onReintentar={refetch}
          />
        ) : totalNoticias === 0 ? (
          <SinResultados mensaje="No hay noticias publicadas por el momento." />
        ) : (
          <>
            <div className="vida-parroquial-tarjetas">
              {noticiasVisibles.map((noticia) => {
                const imagen = noticia.imagenPortada;
                const esAfiche = Boolean(
                  imagen?.alto && imagen?.ancho && imagen.alto > imagen.ancho,
                );

                const contenidoImagen = imagen ? (
                  <img
                    src={imagen.url}
                    {...construirAtributosImagen(
                      imagen,
                      '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
                    )}
                    alt={imagen.textoAlternativo || noticia.titulo}
                    width={imagen.ancho ?? undefined}
                    height={imagen.alto ?? undefined}
                    className={`vida-parroquial-imagen ${
                      esAfiche ? 'vida-parroquial-imagen-afiche' : ''
                    }`}
                    loading="lazy"
                  />
                ) : null;

                return (
                  <article key={noticia.id} className="vida-parroquial-tarjeta">
                    <div className="vida-parroquial-imagen-contenedor">
                      {contenidoImagen &&
                        (noticia.urlExterna ? (
                          <a
                            href={noticia.urlExterna}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="vida-parroquial-imagen-enlace"
                            aria-label={`Abrir ${noticia.titulo} en enlace externo`}
                          >
                            {contenidoImagen}
                          </a>
                        ) : (
                          contenidoImagen
                        ))}
                    </div>

                    <div className="vida-parroquial-contenido">
                      <div className="vida-parroquial-metadatos">
                        <span className="vida-parroquial-categoria">
                          {noticia.categoria?.nombre || noticia.tipo?.nombre}
                        </span>

                        <span className="vida-parroquial-separador" />

                        <span>{formatearFechaLarga(noticia.fechaPublicacion)}</span>
                      </div>

                      <h3 className="vida-parroquial-tarjeta-titulo">{noticia.titulo}</h3>

                      {noticia.resumen && (
                        <p className="vida-parroquial-descripcion">{noticia.resumen}</p>
                      )}

                      {noticia.urlExterna ? (
                        <a
                          href={noticia.urlExterna}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="vida-parroquial-enlace"
                          aria-label={`Leer publicación: ${noticia.titulo}`}
                        >
                          Leer nota
                          <ArrowRight size={15} />
                        </a>
                      ) : (
                        <Link
                          to={`/noticias/${noticia.slug}`}
                          className="vida-parroquial-enlace"
                          aria-label={`Leer publicación: ${noticia.titulo}`}
                        >
                          Leer nota
                          <ArrowRight size={15} />
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {totalNoticias > 1 && (
              <div
                className="vida-parroquial-indicadores"
                aria-label="Controles del carrusel de noticias"
              >
                {noticias.map((noticia, indice) => (
                  <button
                    key={noticia.id}
                    type="button"
                    className={`vida-parroquial-indicador ${
                      indiceActivo === indice ? 'vida-parroquial-indicador-activo' : ''
                    }`}
                    onClick={() => setIndiceActivo(indice)}
                    aria-label={`Mostrar noticias desde la posición ${indice + 1}`}
                    aria-pressed={indiceActivo === indice}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default VidaParroquial;
