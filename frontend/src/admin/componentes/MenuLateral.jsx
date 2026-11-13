import { NavLink } from 'react-router';

// Lista de enlaces del panel. NavLink marca la sección activa con aria-current="page".
export default function MenuLateral({ secciones, alNavegar }) {
  return (
    <nav aria-label="Menú principal" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="flex flex-col gap-1">
        {secciones.map(({ clave, ruta, titulo, icono: Icono }) => (
          <li key={clave}>
            <NavLink
              to={`/admin/${ruta}`}
              onClick={alNavegar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${
                  isActive ? 'bg-gold text-ink' : 'text-cream/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icono className="size-5 shrink-0" aria-hidden="true" />
              {titulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
