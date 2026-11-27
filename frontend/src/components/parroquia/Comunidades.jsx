import { ArrowRight, MapPin } from 'lucide-react';

import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { SEDE_ACTUAL } from '../../config/sede.js';
import { useArbolComunidades } from '../../hooks/index.js';
import { enlaceComoLlegar } from '../../utils/mapas.js';
import { construirAtributosImagen } from './imagenSrcSet.js';

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

function TarjetaComunidad({ comunidad, indice, nivel = 3 }) {
  const principal = comunidad.slug === SEDE_ACTUAL;
  const imagen = comunidad.imagenPortada;
  const hrefComoLlegar = enlaceComoLlegar(comunidad);
  const EtiquetaTitulo = `h${nivel}`;

  return (
    <Reveal
      variante="tarjeta"
      retraso={indice * 120}
      as="article"
      className={`tarjeta-portal group flex flex-col overflow-hidden rounded-md border bg-white ${
        principal ? 'border-gold' : 'border-sand'
      }`}
    >
      {imagen && (
        <div className="overflow-hidden bg-cream">
          <img
            src={imagen.url}
            {...construirAtributosImagen(
              imagen,
              '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
            )}
            alt={imagen.textoAlternativo || comunidad.nombre}
            width={imagen.ancho ?? undefined}
            height={imagen.alto ?? undefined}
            className="foto-hover aspect-[16/10] w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          {comunidad.tipo?.nombre && (
            <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
              {comunidad.tipo.nombre}
            </p>
          )}

          <EtiquetaTitulo className="mt-2 font-display text-h3 font-semibold text-ink">
            {formatearNombreComunidad(comunidad)}
          </EtiquetaTitulo>

          {comunidad.sedePadre?.nombre && (
            <p className="mt-1 font-body text-meta text-muted">
              Depende de {comunidad.sedePadre.nombre}
            </p>
          )}

          {comunidad.direccion && (
            <p className="mt-2 flex items-start gap-1.5 font-body text-meta text-muted">
              <MapPin size={14} aria-hidden="true" className="mt-1 shrink-0" />
              <span>{comunidad.direccion}</span>
            </p>
          )}
        </div>

        {hrefComoLlegar && (
          <div className="mt-4 border-t border-sand pt-3">
            <a
              href={hrefComoLlegar}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Cómo llegar a ${comunidad.nombre} en Google Maps`}
              className="inline-flex min-h-11 items-center gap-1.5 font-body text-button font-semibold text-ink underline-offset-4 hover:underline"
            >
              <span>Cómo llegar</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </Reveal>
  );
}

function Comunidades() {
  const { data: arbol, isPending, isError, refetch } = useArbolComunidades();

  const parroquiasYCapillas = [];
  for (const parroquia of arbol?.parroquias ?? []) {
    parroquiasYCapillas.push(parroquia);
    for (const capilla of parroquia.capillas ?? []) {
      parroquiasYCapillas.push(capilla);
    }
  }
  const comunidadesPasionistas = arbol?.comunidadesPasionistas ?? [];

  return (
    <Seccion id="comunidades" fondo="crema">
      <EncabezadoSeccion
        eyebrow="Pasionistas en Bolivia"
        titulo="Nuestras comunidades"
        bajada="Parroquias y capillas en comunión, junto a la comunidad religiosa pasionista."
      />

      {isPending ? (
        <CargandoSeccion alturaMinima={320} etiqueta="Cargando comunidades" />
      ) : isError ? (
        <ErrorSeccion mensaje="No pudimos cargar las comunidades." onReintentar={refetch} />
      ) : parroquiasYCapillas.length === 0 && comunidadesPasionistas.length === 0 ? (
        <SinResultados mensaje="No hay comunidades disponibles por el momento." />
      ) : (
        <div className="flex flex-col gap-12">
          {parroquiasYCapillas.length > 0 && (
            <div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {parroquiasYCapillas.map((comunidad, indice) => (
                  <TarjetaComunidad key={comunidad.id} comunidad={comunidad} indice={indice} />
                ))}
              </div>
              <div className="mt-8">
                <EnlaceFlecha to="/comunidades">Ver todas las comunidades</EnlaceFlecha>
              </div>
            </div>
          )}

          {comunidadesPasionistas.length > 0 && (
            <div className="border-t border-sand pt-8">
              <div className="mb-6">
                <p className="font-body text-eyebrow font-semibold uppercase tracking-[0.2em] text-muted">
                  Misioneros Pasionistas
                </p>
                <h3 className="mt-2 font-display text-h2 font-semibold text-ink">
                  Comunidad pasionista
                </h3>
                <p className="mt-2 max-w-prose font-body text-body text-muted">
                  Entidad aparte de las parroquias y sus capillas.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {comunidadesPasionistas.map((comunidad, indice) => (
                  <TarjetaComunidad
                    key={comunidad.id}
                    comunidad={comunidad}
                    indice={indice}
                    nivel={4}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Seccion>
  );
}

export default Comunidades;
