import { ArrowRight } from 'lucide-react';

import {
  EncabezadoSeccion,
  EnlaceFlecha,
  Reveal,
  Seccion,
} from '../portal/index.js';
import EnlacePortal from './EnlacePortal.jsx';
import { CargandoSeccion, ErrorSeccion, SinResultados } from './EstadoSeccion.jsx';
import { IconoDinamico } from './IconoDinamico.jsx';
import { useServicios } from '../../hooks/index.js';

function Sacramentos() {
  const { data: servicios = [], isPending, isError, refetch } = useServicios();

  return (
    <Seccion id="sacramentos" fondo="crema">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <EncabezadoSeccion
            eyebrow="Servicios parroquiales"
            titulo="Sacramentos y catequesis"
            bajada="Encuentra los requisitos, fechas de preparación y documentos necesarios para cada sacramento."
            className="mb-6"
          />

          <EnlaceFlecha to="/sacramentos">Ver todos los requisitos</EnlaceFlecha>
        </div>

        <div className="lg:col-span-8">
          {isPending ? (
            <CargandoSeccion alturaMinima={320} etiqueta="Cargando sacramentos y servicios" />
          ) : isError ? (
            <ErrorSeccion
              mensaje="No pudimos cargar los servicios parroquiales."
              onReintentar={refetch}
            />
          ) : servicios.length === 0 ? (
            <SinResultados mensaje="No hay servicios publicados por el momento." />
          ) : (
            <div className="grid grid-cols-1 divide-y divide-sand border-y border-sand md:grid-cols-2 md:gap-4 md:divide-y-0 md:border-y-0">
              {servicios.map(({ id, slug, nombre, descripcionCorta, icono }, indice) => (
                <Reveal
                  key={id}
                  variante="tarjeta"
                  retraso={indice * 120}
                  as="article"
                  className="tarjeta-portal group relative flex items-center justify-between gap-3 py-2 md:flex-col md:items-stretch md:rounded-md md:border md:border-sand md:bg-white md:p-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink md:size-10">
                        <IconoDinamico
                          nombre={icono || 'heart-handshake'}
                          size={20}
                          strokeWidth={1.8}
                        />
                      </span>
                      <h3 className="font-display text-h3 font-semibold text-ink">{nombre}</h3>
                    </div>

                    <p className="mt-3 hidden font-body text-body text-muted md:block">
                      {descripcionCorta}
                    </p>
                  </div>

                  <div className="shrink-0 md:mt-5 md:pt-3">
                    <EnlacePortal
                      to={slug ? `/sacramentos/${slug}` : '/sacramentos'}
                      aria-label={`Consultar requisitos de ${nombre}`}
                      className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:after:hidden"
                    >
                      <span className="hidden md:inline">Ver requisitos</span>
                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="text-muted transition-transform duration-200 ease-salida group-hover:translate-x-1 group-hover:text-ink"
                      />
                    </EnlacePortal>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </Seccion>
  );
}

export default Sacramentos;
