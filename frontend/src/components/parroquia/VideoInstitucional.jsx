import { Play, ArrowRight, Clapperboard } from 'lucide-react';
import {
  anchoContenido,
  TituloSeccion,
  MarcadorVisual,
} from './ElementosComunes.jsx';

function VideoInstitucional() {
  return (
    <section className="bg-deep py-24 md:py-[120px]">
      <div className={`${anchoContenido} text-center`}>
        <TituloSeccion
          overline="Conoce nuestro templo"
          title="Un recorrido por nuestra parroquia"
          center
          light
        />

        <div className="relative mx-auto mt-12 aspect-video max-w-[1000px] overflow-hidden rounded">
          <MarcadorVisual
            label="MINIATURA VIDEO · REEMPLAZAR"
            className="absolute inset-0 h-full w-full"
          />

          <div className="absolute inset-0 bg-deep/35" />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold text-ink shadow-soft">
              <Play fill="currentColor" size={35} />
            </div>
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-2 text-xs text-white md:text-sm">
            <Clapperboard size={20} />
            <span>Recorrido aéreo y del templo · 3:20</span>
          </div>
        </div>

        <div className="visual-control mt-12 flex flex-wrap justify-center gap-4">
          <span className="static-cta">
            Ver video
            <ArrowRight size={17} />
          </span>

          <span className="static-cta-outline text-white">
            Conocer más
          </span>
        </div>
      </div>
    </section>
  );
}

export default VideoInstitucional;