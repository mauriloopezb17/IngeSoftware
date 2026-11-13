import { MapPin, ArrowRight } from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { SEDE_ACTUAL } from '../../config/sede.js';
import { useComunidades } from '../../hooks/index.js';

import '../../styles/Comunidades.css';

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
    <section id="comunidades" className="comunidades">
      <div className={anchoContenido}>
        <div className="comunidades-encabezado">
          <p className="eyebrow comunidades-etiqueta">Pasionistas en Bolivia</p>

          <h2 className="serif-title comunidades-titulo">Nuestras comunidades</h2>

          <p className="comunidades-descripcion">
            Una sola familia pasionista. Cada sede tiene su propio espacio dentro
            de pasionistas.org.bo
          </p>
        </div>

        {isPending ? (
          <CargandoSeccion alturaMinima={320} etiqueta="Cargando comunidades" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar las comunidades."
            onReintentar={refetch}
          />
        ) : comunidades.length === 0 ? (
          <SinResultados mensaje="No hay comunidades disponibles por el momento." />
        ) : (
          <div className="comunidades-tarjetas">
            {comunidades.map((comunidad) => {
              const principal = comunidad.slug === SEDE_ACTUAL;
              const imagen = comunidad.imagenPortada;

              return (
                <article
                  key={comunidad.id}
                  className={`comunidades-tarjeta ${
                    principal ? 'comunidades-tarjeta-principal' : ''
                  }`}
                >
                  <div className="comunidades-imagen-contenedor">
                    {imagen ? (
                      <img
                        src={imagen.url}
                        alt={imagen.textoAlternativo || comunidad.nombre}
                        width={imagen.ancho ?? undefined}
                        height={imagen.alto ?? undefined}
                        className="comunidades-imagen"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="comunidades-imagen-pendiente"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className="comunidades-tarjeta-contenido">
                    {comunidad.tipo?.nombre && (
                      <p className="comunidades-tipo">{comunidad.tipo.nombre}</p>
                    )}

                    <h3 className="comunidades-nombre">{formatearNombreComunidad(comunidad)}</h3>

                    {comunidad.direccion && (
                      <p className="comunidades-ubicacion">
                        <MapPin size={14} />
                        {comunidad.direccion}
                      </p>
                    )}

                    {comunidad.enlaceComoLlegar ? (
                      <a
                        href={comunidad.enlaceComoLlegar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="comunidades-enlace"
                        aria-label={`Cómo llegar a ${comunidad.nombre} en Google Maps`}
                      >
                        Cómo llegar
                        <ArrowRight size={14} />
                      </a>
                    ) : (
                      <span className="comunidades-enlace">
                        Visitar sitio
                        <ArrowRight size={14} />
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Comunidades;
