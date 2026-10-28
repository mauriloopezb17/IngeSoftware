
import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { noticias } from '../../data/datosParroquia.js';

import imagenPastoral from '../../assets/parroquia/imagenes/pastoral familiar.jpg';
import imagenCrucifijo from '../../assets/parroquia/imagenes/crucifijo.webp';
import imagenExterior from '../../assets/parroquia/imagenes/exterior-parroquia.webp';

import '../../styles/VidaParroquial.css';

const imagenesNoticias = {
  pastoral: imagenPastoral,
  crucifijo: imagenCrucifijo,
  exterior: imagenExterior,
};

function VidaParroquial() {
  const [indiceActivo, setIndiceActivo] = useState(0);

  const totalNoticias = noticias.length;

  const cambiarNoticia = (direccion) => {
    setIndiceActivo((actual) => (
      (actual + direccion + totalNoticias) % totalNoticias
    ));
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
            <p className="eyebrow">
              Noticias y notas de prensa
            </p>

            <h2 className="serif-title vida-parroquial-titulo">
              Vida parroquial
            </h2>
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

        <div className="vida-parroquial-tarjetas">
          {noticiasVisibles.map((noticia) => {
            const imagen = imagenesNoticias[noticia.imagen];

            const contenidoImagen = (
              <img
                src={imagen}
                alt={noticia.descripcionImagen}
                className={`vida-parroquial-imagen ${
                  noticia.imagen === 'pastoral'
                    ? 'vida-parroquial-imagen-afiche'
                    : ''
                }`}
                loading="lazy"
              />
            );

            return (
              <article
                key={noticia.titulo}
                className="vida-parroquial-tarjeta"
              >
                <div className="vida-parroquial-imagen-contenedor">
                  {noticia.enlace ? (
                    <a
                      href={noticia.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vida-parroquial-imagen-enlace"
                      aria-label={`Abrir ${noticia.titulo} en Facebook`}
                    >
                      {contenidoImagen}
                    </a>
                  ) : (
                    contenidoImagen
                  )}
                </div>

                <div className="vida-parroquial-contenido">
                  <div className="vida-parroquial-metadatos">
                    <span className="vida-parroquial-categoria">
                      {noticia.categoria}
                    </span>

                    <span className="vida-parroquial-separador" />

                    <span>{noticia.fecha}</span>
                  </div>

                  <h3 className="vida-parroquial-tarjeta-titulo">
                    {noticia.titulo}
                  </h3>

                  <p className="vida-parroquial-descripcion">
                    {noticia.descripcion}
                  </p>

                  {noticia.enlace ? (
                    <a
                      href={noticia.enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vida-parroquial-enlace"
                      aria-label={`Leer publicación: ${noticia.titulo}`}
                    >
                      Leer nota
                      <ArrowRight size={15} />
                    </a>
                  ) : (
                    <span className="vida-parroquial-enlace vida-parroquial-enlace-inactivo">
                      Nota de ejemplo
                    </span>
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
                key={noticia.titulo}
                type="button"
                className={`vida-parroquial-indicador ${
                  indiceActivo === indice
                    ? 'vida-parroquial-indicador-activo'
                    : ''
                }`}
                onClick={() => setIndiceActivo(indice)}
                aria-label={`Mostrar noticias desde la posición ${indice + 1}`}
                aria-pressed={indiceActivo === indice}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default VidaParroquial;
