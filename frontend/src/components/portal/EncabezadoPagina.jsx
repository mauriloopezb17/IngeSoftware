import { Link } from 'react-router';

import Contenedor from './Contenedor.jsx';
import Eyebrow from './Eyebrow.jsx';
import Parallax from './Parallax.jsx';
import RevealTitulo from './RevealTitulo.jsx';

// Encabezado para páginas internas: migas de pan, eyebrow, único h1 (text-h1) y bajada.
function EncabezadoPagina({
  migas = [],
  eyebrow,
  titulo,
  bajada,
  variante = 'crema',
  imagen = null,
  children = null,
}) {
  const esFoto = variante === 'foto' && imagen?.url;

  return (
    <header
      className={
        esFoto
          ? 'relative overflow-hidden bg-ink py-14 text-white md:py-24'
          : 'border-b border-sand bg-cream py-12 text-ink md:py-20'
      }
    >
      {esFoto && (
        <>
          <Parallax className="absolute inset-0">
            <img
              src={imagen.url}
              alt=""
              aria-hidden="true"
              width={imagen.ancho ?? undefined}
              height={imagen.alto ?? undefined}
              className="h-full w-full object-cover"
            />
          </Parallax>
          <div aria-hidden="true" className="absolute inset-0 bg-ink/70" />
        </>
      )}

      <Contenedor className="relative z-10">
        {migas.length > 0 && (
          <nav
            aria-label="Ruta de navegación"
            className={`encabezado-migas mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-meta ${
              esFoto ? 'text-muted-on-dark' : 'text-muted'
            }`}
          >
            {migas.map((miga, indice) => {
              const esUltima = indice === migas.length - 1;
              return (
                <span key={`${miga.texto}-${indice}`} className="inline-flex items-center gap-2">
                  {indice > 0 && (
                    <span aria-hidden="true" className={esFoto ? 'text-white/40' : 'text-ink/30'}>
                      /
                    </span>
                  )}
                  {miga.enlace && !esUltima ? (
                    <Link
                      to={miga.enlace}
                      className={`inline-flex min-h-11 items-center underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        esFoto
                          ? 'text-white/90 hover:text-white focus-visible:outline-gold'
                          : 'text-ink/80 hover:text-ink focus-visible:outline-ink'
                      }`}
                    >
                      {miga.texto}
                    </Link>
                  ) : (
                    <span
                      aria-current={esUltima ? 'page' : undefined}
                      className={esFoto ? 'text-white' : 'text-ink'}
                    >
                      {miga.texto}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        {eyebrow && (
          <Eyebrow oscuro={esFoto} alCargar className="mb-4">
            {eyebrow}
          </Eyebrow>
        )}

        <RevealTitulo
          as="h1"
          alCargar
          retraso={120}
          duracion={950}
          className={`max-w-3xl font-display text-h1 font-semibold text-balance ${
            esFoto ? 'text-white' : 'text-ink'
          }`}
        >
          {titulo}
        </RevealTitulo>

        {bajada && (
          <p
            className={`hero-entrada hero-entrada-retraso-2 mt-4 max-w-prose font-body text-lead text-pretty ${
              esFoto ? 'text-muted-on-dark' : 'text-muted'
            }`}
          >
            {bajada}
          </p>
        )}

        {children && <div className="mt-6">{children}</div>}
      </Contenedor>
    </header>
  );
}

export default EncabezadoPagina;
