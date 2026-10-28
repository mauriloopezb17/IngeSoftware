
import {
  ArrowRight,
  Star,
  Music2,
  BookOpen,
  Users,
  Cross,
  HeartHandshake,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';

import '../../styles/GruposPastorales.css';

const gruposPastorales = [
  {
    nombre: 'Monaguillos',
    horario: 'Sábados · 10:00',
    icono: Star,
  },
  {
    nombre: 'Coro parroquial',
    horario: 'Jueves · 19:00',
    icono: Music2,
  },
  {
    nombre: 'Catequistas',
    horario: 'Formación mensual',
    icono: BookOpen,
  },
  {
    nombre: 'Pastoral Juvenil',
    horario: 'Viernes · 18:30',
    icono: Users,
  },
  {
    nombre: 'Legión de María',
    horario: 'Martes · 16:00',
    icono: Cross,
  },
  {
    nombre: 'Pastoral social',
    horario: 'Cáritas parroquial',
    icono: HeartHandshake,
  },
];

function GruposPastorales() {
  return (
    <section id="comunidad" className="grupos-pastorales">
      <div className={`${anchoContenido} grupos-contenedor`}>
        <div className="grupos-informacion">
          <p className="eyebrow">
            Comunidad
          </p>

          <h2 className="serif-title grupos-titulo">
            Grupos y
            <br />
            pastorales
          </h2>

          <p className="grupos-descripcion">
            Hay un lugar para ti. Niños, jóvenes, familias y adultos
            mayores encuentran aquí un espacio para servir, formarse
            y crecer en la fe.
          </p>

          <a href="#contacto" className="grupos-boton">
            Quiero participar
            <ArrowRight size={17} />
          </a>
        </div>

        <div className="grupos-tarjetas">
          {gruposPastorales.map(({ nombre, horario, icono: Icono }) => (
            <article key={nombre} className="grupos-tarjeta">
              <span className="grupos-icono">
                <Icono size={17} strokeWidth={1.8} />
              </span>

              <div className="grupos-tarjeta-informacion">
                <h3>{nombre}</h3>
                <p>{horario}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GruposPastorales;
