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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {servicios.map(({ id, slug, nombre, descripcionCorta, icono }, indice) => (
                <Reveal
                  key={id}
                  variante="tarjeta"
                  retraso={indice * 90}
                  as="article"
                  className="group flex flex-col justify-between rounded-md border border-sand bg-white p-6 transition-[border-color,transform] duration-200 ease-out hover:-translate-y-1 hover:border-gold"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-gold-soft text-ink">
                        <IconoDinamico
                          nombre={icono || 'heart-handshake'}
                          size={20}
                          strokeWidth={1.8}
                        />
                      </span>
                      <h3 className="font-display text-h3 font-semibold text-ink">{nombre}</h3>
                    </div>

                    <p className="mt-3 font-body text-body text-muted">{descripcionCorta}</p>
                  </div>

                  <div className="mt-5 pt-3">
                    <EnlacePortal
                      to={slug ? `/sacramentos/${slug}` : '/sacramentos'}
                      aria-label={`Consultar requisitos de ${nombre}`}
                      className="inline-flex min-h-11 items-center gap-2 font-body text-button font-semibold text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span>Ver requisitos</span>
                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="transition-transform duration-200 ease-salida group-hover:translate-x-1"
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
