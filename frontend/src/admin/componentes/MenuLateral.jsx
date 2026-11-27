import { NavLink } from 'react-router';

import { useResumenObservaciones } from '../proclamas/useResumenObservaciones.js';
import { GRUPOS_MENU } from '../rutas.js';
import { useSesion } from '../sesion/SesionContexto.js';

// Lista de enlaces del panel agrupada por dominio. NavLink marca la sección activa con aria-current="page".
export default function MenuLateral({ secciones, alNavegar }) {
  const { usuario } = useSesion();
  const esCoordinador = usuario?.rol?.codigo === 'COORDINADOR';
  const porClave = new Map(secciones.map((s) => [s.clave, s]));
  const { data: resumenObservaciones } = useResumenObservaciones();
  const noLeidas = resumenObservaciones?.noLeidas ?? 0;

  return (
    <nav aria-label="Menú principal" className="flex-1 overflow-y-auto px-3 py-4">
      <div className="flex flex-col gap-5">
        {GRUPOS_MENU.map((grupo) => {
          const elementos = grupo.claves.map((c) => porClave.get(c)).filter(Boolean);
          if (!elementos.length) return null;

          return (
            <div key={grupo.titulo}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-on-dark/80">
                {grupo.titulo}
              </p>
              <ul className="flex flex-col gap-0.5">
                {elementos.map(({ clave, ruta, titulo, icono: Icono }) => (
                  <li key={clave}>
                    <NavLink
                      to={`/admin/${ruta}`}
                      onClick={alNavegar}
                      className={({ isActive }) =>
                        `relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-salida focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none ${
                          isActive
                            ? 'bg-ink-soft font-semibold text-white'
                            : 'text-muted-on-dark hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-sm bg-gold"
                            />
                          )}
                          <Icono className={`size-4 shrink-0 ${isActive ? 'text-gold' : ''}`} aria-hidden="true" />
                          <span>{esCoordinador && clave === 'grupos' ? 'Mis grupos' : titulo}</span>
                          {clave === 'proclamas' && noLeidas > 0 && (
                            <span
                              aria-label={`${noLeidas} observaciones sin leer`}
                              className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink"
                            >
                              {noLeidas}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
