import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { anchoContenido, TituloSeccion, MarcadorVisual } from './ElementosComunes.jsx';
import { noticias } from '../../data/datosParroquia.js';
function Noticias() {
  return <section className="bg-cream py-24 md:py-[120px]">
    <div className={anchoContenido}>
      <div className="flex items-end justify-between">
        <TituloSeccion overline="Noticias y notas de prensa" title="Últimas noticias" />
        <div className="hidden md:flex gap-3 text-muted visual-control">
          <span className="border border-ink/15 p-4">
            <ChevronLeft size={19} />
          </span>
          <span className="border border-ink/15 p-4">
            <ChevronRight size={19} />
          </span>
        </div>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">{noticias.map(([date, title]) => <article key={date} className="bg-white shadow-soft overflow-hidden">
        <MarcadorVisual className="h-[250px]" />
        <div className="p-7">
          <p className="text-xs text-goldDark tracking-[.12em] font-bold">{date}</p>
          <h3 className="mt-3 min-h-[96px] text-[29px] font-display font-semibold leading-[1.1]">{title}</h3>
          <p className="mt-5 flex items-center gap-2 text-goldDark text-sm font-semibold">Leer noticia <ArrowRight size={16} />
          </p>
        </div>
      </article>)}</div>
      <div className="mt-12 flex gap-2">
        <span className="h-2 w-8 bg-gold" />{[1, 2, 3].map(i => <span className="h-2 w-2 bg-ink/20" key={i} />)}</div>
    </div>
  </section>;
}
export default Noticias;
