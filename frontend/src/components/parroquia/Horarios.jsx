import { anchoContenido, TituloSeccion } from './ElementosComunes.jsx';
import { horarios } from '../../data/datosParroquia.js';
function Horarios() {
  return <section className="bg-white py-24 md:py-[120px]">
    <div className={anchoContenido}>
      <div className="flex flex-wrap justify-between items-end gap-5">
        <TituloSeccion overline="Horarios" title="Celebra la fe con nosotros" />
        <p className="text-muted text-sm max-w-[420px] leading-relaxed">Te esperamos para compartir la eucaristía, la oración y la vida parroquial.</p>
      </div>
      <div className="mt-14 grid gap-6 md:grid-cols-3">{horarios.map(({ title, icon: Icon, rows, note }) => <article key={title} className="border border-ink/10 bg-cream p-8 md:p-9">
        <div className="flex items-start gap-3 h-14">
          <Icon className="mt-1 text-goldDark shrink-0" size={28} />
          <h3 className="font-display font-semibold text-[26px] md:text-[30px] leading-tight">{title}</h3>
        </div>{rows.map(([day, time]) => <div key={day} className="border-b border-ink/10 py-4">
          <p className="text-[12px] font-bold uppercase tracking-wider text-muted">{day}</p>
          <p className="font-display text-[25px] leading-tight font-semibold mt-2">{time}</p>
        </div>)}<p className="text-xs mt-4 text-muted leading-relaxed">{note}</p>
      </article>)}</div>
    </div>
  </section>;
}
export default Horarios;
