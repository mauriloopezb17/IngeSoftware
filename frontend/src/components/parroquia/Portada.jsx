
import {
  ArrowRight,
  Play,
  Clock3,
  Cross,
  CalendarDays,
  CircleDot,
} from 'lucide-react';

import Encabezado from './Encabezado.jsx';

import {
  anchoContenido,
  EtiquetaSeccion,
} from './ElementosComunes.jsx';

function Portada() {
  const accesosRapidos = [
    { nombre: 'Horarios de misa', icono: Clock3 },
    { nombre: 'Sacramentos', icono: Cross },
    { nombre: 'Calendario', icono: CalendarDays },
    { nombre: 'Proclamas', icono: CircleDot },
  ];

  return (
    <section className="relative bg-cream">
      {/* Fondo provisional de la portada */}
      <div className="relative min-h-[860px] bg-[linear-gradient(149deg,#5c4f4a_14%,#241f20_86%)]">
        {/* Superposición oscura */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,20,20,.55)_0%,transparent_65%),linear-gradient(180deg,rgba(23,20,20,.78)_0%,rgba(23,20,20,.25)_28%,rgba(23,20,20,.35)_60%,rgba(23,20,20,.88)_100%)]" />

        <div className="relative z-10">
          <Encabezado />

          {/* Presentación principal */}
          <div className={`${anchoContenido} pt-32 md:pt-[150px]`}>
            <EtiquetaSeccion light>
              Parroquia Pasionista · Obrajes, La Paz
            </EtiquetaSeccion>

            <h1 className="serif-title mt-5 text-[64px] leading-[.99] tracking-tight text-white md:text-[88px]">
              Señor de la
              <br />
              Exaltación
            </h1>

            <p className="mt-7 max-w-[620px] text-[16px] leading-[1.8] text-white/90 md:text-lg">
              Una comunidad que camina junto a Cristo crucificado y
              resucitado. Te esperamos en casa, con las puertas
              siempre abiertas.
            </p>

            {/* Botones visuales */}
            <div className="visual-control mt-9 flex flex-wrap items-center gap-4">
              <span className="static-cta">
                Ver horarios de misa
                <ArrowRight size={18} />
              </span>

              <span className="static-cta-outline text-white">
                Conócenos
              </span>
            </div>
          </div>

          {/* Información del video institucional */}
          <div className={`${anchoContenido} hidden justify-end pt-3 md:flex`}>
            <div className="flex items-center gap-3 border border-white/20 bg-deep/35 p-2 pr-6 text-white">
              <div className="rounded-full bg-gold p-3 text-ink">
                <Play size={16} fill="currentColor" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Video institucional
                </p>

                <p className="text-xs text-white/70">
                  Recorrido aéreo · 1:45
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div
        className={`${anchoContenido} relative z-20 -mt-[60px] grid grid-cols-2 overflow-hidden rounded-sm bg-white shadow-soft md:grid-cols-4`}
      >
        {accesosRapidos.map(({ nombre, icono: Icono }) => (
          <div
            key={nombre}
            className="flex min-h-[108px] items-center gap-4 border-r border-ink/10 px-5 md:px-7"
          >
            <Icono className="text-goldDark" size={27} />

            <span className="text-sm font-semibold">
              {nombre}
            </span>

            <ArrowRight
              size={15}
              className="ml-auto hidden text-muted sm:block"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export default Portada;