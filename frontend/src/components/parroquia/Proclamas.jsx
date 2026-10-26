
import { CircleDot, ArrowRight } from 'lucide-react';

import {
  anchoContenido,
  TituloSeccion,
} from './ElementosComunes.jsx';

import { proclamas } from '../../data/datosParroquia.js';

function Proclamas() {
  return (
    <section className="bg-goldPale py-24 md:py-[100px]">
      <div
        className={`${anchoContenido} grid items-center gap-12 lg:grid-cols-[460px_1fr] lg:gap-20`}
      >
        {/* Información sobre las proclamas */}
        <div>
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white text-goldDark">
            <CircleDot size={29} />
          </div>

          <TituloSeccion
            overline="Proclamas matrimoniales"
            title="Quieren unirse en el sacramento del matrimonio"
          />

          <p className="mt-6 text-sm leading-[1.8] text-muted md:text-base">
            Si alguien conoce algún impedimento por el cual estas
            parejas no puedan contraer matrimonio, está obligado
            a comunicarlo al párroco o en secretaría.
          </p>

          <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-goldDark">
            Ver historial de proclamas
            <ArrowRight size={16} />
          </p>
        </div>

        {/* Listado de proclamas matrimoniales */}
        <div className="rounded bg-white px-6 py-4 shadow-soft md:px-10">
          {proclamas.map(([personas, fecha, etiqueta]) => (
            <div
              key={personas}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 py-6"
            >
              <div>
                <h3 className="font-display text-[23px] font-semibold leading-snug">
                  {personas}
                </h3>

                <p className="mt-1 text-sm text-muted">
                  {fecha}
                </p>
              </div>

              <span className="whitespace-nowrap bg-goldPale px-3 py-2 text-[11px] font-bold uppercase text-goldDark">
                {etiqueta}
              </span>
            </div>
          ))}

          <p className="py-4 text-xs text-muted">
            Nombres ficticios — datos de ejemplo para el prototipo.
          </p>
        </div>
      </div>
    </section>
  );
}

export default Proclamas;
