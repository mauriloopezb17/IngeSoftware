import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { usePagina } from '../../hooks/index.js';

import '../../styles/Nosotros.css';

function Nosotros() {
  const { data: pagina, isPending, isError, refetch } = usePagina('nosotros');

  const bloques = pagina?.bloques ?? [];
  const textoImagen = bloques.find((bloque) => bloque.tipo === 'texto_imagen')?.contenido;
  const cita = bloques.find((bloque) => bloque.tipo === 'cita')?.contenido;
  const parroco = bloques.find((bloque) => bloque.tipo === 'tarjetas')?.contenido?.items?.[0];

  const parrafos = textoImagen?.texto ? textoImagen.texto.split('\n\n') : [];

  return (
    <section id="nosotros" className="nosotros">
      <div className={`${anchoContenido} nosotros-contenedor`}>
        {isPending ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <CargandoSeccion alturaMinima={480} etiqueta="Cargando sección nosotros" />
          </div>
        ) : isError ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <ErrorSeccion
              mensaje="No pudimos cargar la información de nuestra parroquia."
              onReintentar={refetch}
            />
          </div>
        ) : !textoImagen && !cita && !parroco ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <SinResultados mensaje="No hay información disponible en esta sección." />
          </div>
        ) : (
          <>
            <div className="nosotros-imagen-contenedor">
              <div className="nosotros-marco" />

              {textoImagen?.url_imagen && (
                <img
                  src={textoImagen.url_imagen}
                  alt={textoImagen.texto_alternativo || textoImagen.titulo}
                  className="nosotros-imagen"
                  loading="lazy"
                />
              )}

              {textoImagen?.tarjeta && (
                <div className="nosotros-tarjeta">
                  {textoImagen.tarjeta.etiqueta && (
                    <p className="nosotros-tarjeta-etiqueta">
                      {textoImagen.tarjeta.etiqueta}
                    </p>
                  )}

                  <p className="nosotros-tarjeta-titulo">
                    {textoImagen.tarjeta.titulo}
                  </p>

                  {textoImagen.tarjeta.descripcion && (
                    <p className="nosotros-tarjeta-descripcion">
                      {textoImagen.tarjeta.descripcion}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="nosotros-informacion">
              {textoImagen && (
                <>
                  <TituloSeccion
                    overline={textoImagen.etiqueta || 'Quiénes somos'}
                    title={textoImagen.titulo}
                  />

                  {parrafos.map((parrafo, indice) => (
                    <p key={indice} className="nosotros-descripcion">
                      {parrafo}
                    </p>
                  ))}
                </>
              )}

              {cita && (
                <blockquote className="nosotros-cita">
                  <p className="nosotros-cita-texto">“{cita.texto}”</p>

                  {cita.autor && (
                    <cite className="nosotros-cita-autor">— {cita.autor}</cite>
                  )}
                </blockquote>
              )}

              <div className="nosotros-pie">
                {parroco && (
                  <div className="nosotros-parroco">
                    {parroco.url_imagen && (
                      <div className="nosotros-avatar">
                        <img
                          src={parroco.url_imagen}
                          alt={parroco.texto_alternativo || parroco.titulo}
                          className="nosotros-avatar-imagen"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div>
                      <p className="nosotros-parroco-nombre">{parroco.titulo}</p>

                      {parroco.subtitulo && (
                        <p className="nosotros-parroco-cargo">{parroco.subtitulo}</p>
                      )}
                    </div>
                  </div>
                )}

                <span className="nosotros-boton visual-control">
                  Conoce nuestra historia
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Nosotros;
