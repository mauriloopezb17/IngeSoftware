import { ArrowRight } from 'lucide-react';

import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { useProclamas } from '../../hooks/index.js';
import { formatearFechaBoda } from '../../utils/formatoPortal.js';

import '../../styles/Proclamas.css';

function AnillosMatrimoniales() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M12 5 14 3 16 5 14 7Z" />
      <path d="M14 7v2" />
    </svg>
  );
}

function Proclamas() {
  const { data: proclamas = [], isPending, isError, refetch } = useProclamas();

  return (
    <section id="proclamas" className="proclamas">
      <div className={`${anchoContenido} proclamas-contenedor`}>
        <div className="proclamas-informacion">
          <div className="proclamas-icono">
            <AnillosMatrimoniales />
          </div>

          <TituloSeccion
            overline="Proclamas matrimoniales"
            title="Quieren unirse en el sacramento del matrimonio"
          />

          <p className="proclamas-descripcion">
            Si alguien conoce algún impedimento por el cual estas parejas no
            puedan contraer matrimonio, está obligado a comunicarlo al párroco o
            en secretaría.
          </p>

          <a href="#proclamas-listado" className="proclamas-enlace">
            Ver historial de proclamas
            <ArrowRight size={15} />
          </a>
        </div>

        <div id="proclamas-listado" className="proclamas-tarjeta">
          {isPending ? (
            <CargandoSeccion
              alturaMinima={240}
              etiqueta="Cargando proclamas matrimoniales"
            />
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos cargar las proclamas matrimoniales."
              onReintentar={refetch}
            />
          ) : proclamas.length === 0 ? (
            <SinResultados mensaje="No hay proclamas vigentes esta semana." />
          ) : (
            <>
              {proclamas.map(
                ({ id, contrayente1, contrayente2, fechaMatrimonio, numeroProclama }) => (
                  <article key={id} className="proclamas-fila">
                    <div className="proclamas-datos">
                      <h3 className="proclamas-nombres">
                        {`${contrayente1} & ${contrayente2}`}
                      </h3>

                      <p className="proclamas-fecha">
                        {formatearFechaBoda(fechaMatrimonio)}
                      </p>
                    </div>

                    <span className="proclamas-etiqueta">
                      {`${numeroProclama}.ª proclama`}
                    </span>
                  </article>
                ),
              )}

              <p className="proclamas-nota">
                Nombres ficticios — datos de ejemplo para el prototipo.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Proclamas;
