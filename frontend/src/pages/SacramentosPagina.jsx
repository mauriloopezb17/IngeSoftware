import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import {
  EncabezadoPagina,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../components/portal/index.js';
import { CargandoSeccion, ErrorSeccion, SinResultados } from '../components/parroquia/EstadoSeccion.jsx';
import { IconoDinamico } from '../components/parroquia/IconoDinamico.jsx';
import { useServicios } from '../hooks/index.js';

function SacramentosPagina() {
  const { data: servicios = [], isPending, isError, refetch } = useServicios();

  return (
    <>
      <title>Sacramentos y catequesis | Parroquia Señor de la Exaltación</title>
      <meta
        name="description"
        content="Requisitos, charlas de preparación, fechas e inscripciones para Bautismo, Primera Comunión, Confirmación, Matrimonio y Unción de los enfermos."
      />

      <EncabezadoPagina
        migas={[{ texto: 'Inicio', enlace: '/' }, { texto: 'Sacramentos' }]}
        eyebrow="Servicios parroquiales"
        titulo="Sacramentos y catequesis"
        bajada="Encuentra los requisitos, fechas de preparación y documentos necesarios para cada sacramento."
      />

      <Seccion fondo="blanco">
        {isPending ? (
          <CargandoSeccion alturaMinima={360} etiqueta="Cargando sacramentos y servicios" />
        ) : isError ? (
          <ErrorSeccion
            mensaje="No pudimos cargar los servicios parroquiales."
            onReintentar={refetch}
          />
        ) : servicios.length === 0 ? (
          <SinResultados mensaje="No hay servicios publicados por el momento." />
        ) : (
          <ol className="divide-y divide-sand border-y border-sand">
            {servicios.map((servicio, indice) => {
              const numero = String(indice + 1).padStart(2, '0');
              return (
                <li key={servicio.id}>
                  <Reveal
                    variante="tarjeta"
                    retraso={indice * 60}
                    className="group py-6 md:py-8"
                  >
                    <Link
                      to={`/sacramentos/${servicio.slug}`}
                      className="grid grid-cols-1 items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink md:grid-cols-12 md:gap-8"
                    >
                      <div className="flex items-center gap-4 md:col-span-4">
                        <span className="font-display text-h2 font-semibold lining-nums tabular-nums text-muted">
                          {numero}
                        </span>

                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                          <IconoDinamico
                            nombre={servicio.icono || 'heart-handshake'}
                            size={22}
                            strokeWidth={1.8}
                          />
                        </span>

                        <h2 className="font-display text-h3 font-semibold text-ink transition-colors duration-150 group-hover:text-muted">
                          {servicio.nombre}
                        </h2>
                      </div>

                      <p className="max-w-prose font-body text-body text-muted md:col-span-5">
                        {servicio.descripcionCorta}
                      </p>

                      <div className="flex items-center md:col-span-3 md:justify-end">
                        <span className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink">
                          <span>Requisitos y fechas</span>
                          <ArrowRight
                            size={16}
                            aria-hidden="true"
                            className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
                          />
                        </span>
                      </div>
                    </Link>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-12 flex flex-col gap-4 rounded-md border border-sand bg-cream p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <h2 className="font-display text-h3 font-semibold text-ink">
              ¿Preparan su matrimonio en la parroquia?
            </h2>
            <p className="mt-1 font-body text-body text-muted">
              Consulta las proclamas matrimoniales vigentes e historial público.
            </p>
          </div>
          <EnlaceFlecha to="/proclamas">Ver proclamas matrimoniales</EnlaceFlecha>
        </div>
      </Seccion>
    </>
  );
}

export default SacramentosPagina;
