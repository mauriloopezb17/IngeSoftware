import { Link } from 'react-router';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

// Tarjeta del resumen del inicio. Cada una hace su propia consulta: si una falla, las demás se siguen viendo.
//   consulta: resultado de useQuery; cantidad: texto grande (por ejemplo «3»); filas: elementos de la lista.
export default function TarjetaResumen({ id, titulo, icono: Icono, consulta, cantidad, vacio, filas = [], enlace }) {
  const { isPending, isError, error, refetch } = consulta;

  return (
    <article aria-labelledby={id} className="flex flex-col gap-3 rounded-lg border border-borderSoft bg-white p-5">
      <header className="flex items-center gap-2 text-muted">
        <Icono className="size-5 shrink-0" aria-hidden="true" />
        <h2 id={id} className="text-sm font-semibold uppercase tracking-wide">
          {titulo}
        </h2>
      </header>

      {isPending && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando…
        </p>
      )}

      {isError && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-redParish">
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            No se pudo cargar: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md border border-redParish/40 bg-white px-3 py-1 font-medium hover:bg-redParish/5 focus-visible:outline-2 focus-visible:outline-redParish"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isPending && !isError && (
        <>
          <p className="font-display text-4xl font-semibold text-ink">{cantidad}</p>
          {filas.length ? (
            <ul className="flex flex-col gap-1.5 text-sm text-charcoal">
              {filas.map(({ clave, contenido }) => (
                <li key={clave} className="break-words">
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
          className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-semibold text-goldDark underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-goldDark"
        >
          {enlace.texto} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}
