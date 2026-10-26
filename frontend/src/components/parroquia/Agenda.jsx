import { ChevronRight, Megaphone, FileText, ArrowRight, CalendarDays } from 'lucide-react';
import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { eventos, avisos } from '../../data/datosParroquia.js';
function Agenda() {
  return <section className="bg-white py-24 md:py-[120px]">
    <div className={`${anchoContenido} grid gap-14 lg:grid-cols-[736px_1fr] lg:gap-[72px]`}>
      <div>
        <TituloSeccion overline="Agenda parroquial" title="Próximos encuentros" />
        <div className="mt-8 space-y-3">{eventos.map(e => <article key={e.day} className="flex items-center gap-4 border border-ink/10 p-4 md:p-5">
          <div className="flex h-[96px] w-[86px] shrink-0 flex-col items-center justify-center bg-goldPale">
            <span className="font-display font-semibold text-5xl leading-none">{e.day}</span>
            <span className="font-bold tracking-[.2em] text-[11px] text-goldDark">{e.month}</span>
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[11px] uppercase tracking-wider text-goldDark font-bold">{e.tag}</p>
            <h3 className="font-display font-semibold text-[25px] leading-tight">{e.title}</h3>
            <p className="mt-1 text-xs md:text-sm text-muted">{e.detail}</p>
          </div>
          <ChevronRight className="ml-auto shrink-0 text-muted" size={19} />
        </article>)}</div>
        <p className="text-xs text-muted mt-5">
          <CalendarDays className="inline-block mr-2" size={16} />Eventos de ejemplo para la versión estática del sitio.</p>
      </div>
      <aside>
        <div className="bg-cream p-7 md:p-8">
          <div className="flex items-center gap-3">
            <Megaphone size={24} className="text-goldDark" />
            <h3 className="font-display font-semibold text-[30px]">Avisos parroquiales</h3>
          </div>{avisos.map(([date, text]) => <div key={date} className="border-b border-ink/10 py-5">
            <p className="text-goldDark font-bold text-xs uppercase tracking-wider">{date}</p>
            <p className="mt-2 text-sm leading-[1.7]">{text}</p>
          </div>)}</div>
        <div className="mt-6 bg-ink p-7 md:p-8 text-white">
          <FileText size={31} className="text-gold" />
          <p className="mt-4 text-gold uppercase tracking-widest text-xs font-bold">Boletín parroquial</p>
          <h3 className="mt-2 font-display text-[31px] font-semibold">Edición de octubre 2026</h3>
          <p className="text-white/70 text-sm leading-[1.8] mt-3">Reflexiones, agenda del mes y noticias de nuestros grupos. PDF · 2,4 MB</p>
          <div className="mt-6 visual-control">
            <span className="static-cta">Ver boletín <ArrowRight size={17} />
            </span>
          </div>
        </div>
      </aside>
    </div>
  </section>;
}
export default Agenda;
