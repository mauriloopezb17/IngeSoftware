import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

import { Aviso, Boton } from '../ui/index.js';

// Tarjeta del resumen del inicio. Cada una hace su propia consulta: si una falla, las demás se siguen viendo.
//   consulta: resultado de useQuery; cantidad: texto grande (por ejemplo «3 eventos»); filas: elementos de la lista.
export default function TarjetaResumen({ id, titulo, icono: Icono, consulta, cantidad, vacio, filas = [], enlace }) {
  const { isPending, isError, error, refetch } = consulta;

  return (
    <article aria-labelledby={id} className="flex flex-col gap-3 rounded-lg border border-sand bg-white p-5">
      <header className="flex items-center justify-between gap-2 text-muted">
        <h2 id={id} className="text-xs font-semibold uppercase tracking-wider">
          {titulo}
        </h2>
        <Icono className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </header>

      {isPending && (
        <div role="status" className="flex flex-col gap-2.5 py-1">
          <span className="sr-only">Cargando…</span>
          <div aria-hidden="true" className="h-8 w-2/3 animate-pulse rounded bg-sand/70 motion-reduce:animate-none" />
          <div aria-hidden="true" className="h-4 w-full animate-pulse rounded bg-sand/60 motion-reduce:animate-none" />
          <div aria-hidden="true" className="h-4 w-4/5 animate-pulse rounded bg-sand/60 motion-reduce:animate-none" />
        </div>
      )}

      {isError && (
        <Aviso
          tipo="error"
          accion={
            <Boton variante="secundario" tamano="sm" onClick={() => refetch()}>
              Reintentar
            </Boton>
          }
        >
          <p>No se pudo cargar: {error.message}</p>
        </Aviso>
      )}

      {!isPending && !isError && (
        <>
          <p className="font-body text-3xl font-semibold tracking-tight tabular-nums text-ink">{cantidad}</p>
          {filas.length ? (
            <ul className="flex flex-col gap-2 border-t border-sand/70 pt-3 text-sm text-ink">
              {filas.map(({ clave, contenido }) => (
                <li key={clave} className="break-words leading-snug">
                  {contenido}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{vacio}</p>
          )}
        </>
      )}

      {enlace && (
        <Link
          to={enlace.a}
          className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {enlace.texto} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
