import { ArrowRight } from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { useGruposPastorales } from '../../hooks/index.js';

import '../../styles/GruposPastorales.css';

function GruposPastorales() {
  const { data: grupos = [], isPending, isError, refetch } = useGruposPastorales();

  return (
    <section id="comunidad" className="grupos-pastorales">
      <div className={`${anchoContenido} grupos-contenedor`}>
        <div className="grupos-informacion">
          <p className="eyebrow">Comunidad</p>

          <h2 className="serif-title grupos-titulo">
            Grupos y
            <br />
            pastorales
          </h2>

          <p className="grupos-descripcion">
            Hay un lugar para ti. Niños, jóvenes, familias y adultos mayores
            encuentran aquí un espacio para servir, formarse y crecer en la fe.
          </p>

          <a href="#contacto" className="grupos-boton">
            Quiero participar
            <ArrowRight size={17} />
          </a>
        </div>

        <div className="grupos-tarjetas">
          {isPending ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <CargandoSeccion alturaMinima={240} etiqueta="Cargando grupos pastorales" />
            </div>
          ) : isError ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <ErrorSeccion
                mensaje="No pudimos cargar los grupos pastorales."
                onReintentar={refetch}
              />
            </div>
          ) : grupos.length === 0 ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <SinResultados mensaje="No hay grupos pastorales publicados por el momento." />
            </div>
          ) : (
            grupos.map(({ id, nombre, horarioReunion, icono }) => (
              <article key={id} className="grupos-tarjeta">
                <span className="grupos-icono">
                  <IconoDinamico nombre={icono} size={17} strokeWidth={1.8} />
                </span>

                <div className="grupos-tarjeta-informacion">
                  <h3>{nombre}</h3>
                  {horarioReunion && <p>{horarioReunion}</p>}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default GruposPastorales;
