import { ArrowRight } from 'lucide-react';
import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { sacramentos } from '../../data/datosParroquia.js';
function Sacramentos() {
  return <section className="bg-cream py-24 md:py-[120px]">
    <div className={anchoContenido}>
      <div className="max-w-[680px] mx-auto">
        <TituloSeccion overline="Servicios parroquiales" title="Sacramentos y catequesis" description="Te acompañamos en cada etapa de tu camino de fe. Conoce nuestros sacramentos, requisitos y espacios de formación." center />
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{sacramentos.map(({ name, icon: Icon, text }) => <article key={name} className="min-h-[294px] border border-ink/10 bg-white px-9 py-10 shadow-soft/40">
        <div className="mb-7 flex h-14 w-14 items-center justify-center bg-goldPale text-goldDark rounded-full">
          <Icon size={27} />
        </div>
        <h3 className="font-display font-semibold text-[30px] leading-tight">{name}</h3>
        <p className="mt-3 min-h-16 text-sm leading-[1.8] text-muted">{text}</p>
        <div className="mt-4 flex items-center gap-2 font-semibold text-sm text-goldDark">Conocer más <ArrowRight size={16} />
        </div>
      </article>)}</div>
      <div className="mt-14 text-center visual-control">
        <span className="static-cta !bg-ink !text-white">Ver todos los servicios <ArrowRight size={17} />
        </span>
      </div>
    </div>
  </section>;
}
export default Sacramentos;
