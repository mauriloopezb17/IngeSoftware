import { anchoContenido, MarcadorVisual, TituloSeccion } from './ElementosComunes.jsx';
function Nosotros() {
  return <section className="bg-cream py-24 md:py-[120px]">
    <div className={`${anchoContenido} grid gap-14 lg:grid-cols-[540px_1fr] lg:gap-24 items-center`}>
      <div className="relative max-w-[540px] pb-12 pr-10">
        <div className="absolute left-10 right-0 top-10 bottom-3 border-2 border-gold" />
        <MarcadorVisual className="h-[450px] md:h-[600px] w-full" />
        <div className="absolute -right-2 bottom-0 bg-ink p-6 md:p-7 shadow-soft text-white">
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gold">Congregación de la Pasión</p>
          <p className="font-display text-[27px] md:text-[30px] font-semibold">Pasionistas · C.P.</p>
          <p className="text-xs md:text-sm">Fundada por San Pablo de la Cruz</p>
        </div>
      </div>
      <div>
        <TituloSeccion overline="Quiénes somos" title="Una casa de oración en el corazón de Obrajes" />
        <p className="mt-6 text-muted leading-[1.9] text-base md:text-lg">Somos una comunidad parroquial confiada a los Padres Pasionistas, que desde la memoria de la Pasión de Cristo acompaña a las familias de Obrajes en la fe, los sacramentos y el servicio a los más necesitados.</p>
        <blockquote className="my-7 border-l-[3px] border-gold pl-5">
          <p className="font-display italic text-[27px] md:text-[32px] leading-tight">“Que la Pasión de Jesucristo esté siempre grabada en nuestros corazones.”</p>
          <cite className="mt-2 block not-italic text-sm text-muted">— Lema de la Congregación Pasionista</cite>
        </blockquote>
        <div className="flex flex-wrap items-center gap-4 pt-4">
          <div className="h-16 w-16 rounded-full placeholder border-2 border-white" />
          <div>
            <p className="font-display font-semibold text-2xl">P. Gregorio, C.P.</p>
            <p className="text-muted text-sm">Párroco</p>
          </div>
          <span className="static-cta-outline text-goldDark visual-control">Conoce nuestra historia</span>
        </div>
      </div>
    </div>
  </section>;
}
export default Nosotros;
