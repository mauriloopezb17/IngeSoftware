
import {
  Clock3,
  Phone,
  MessageCircle,
  ChevronDown,
  Search,
  ArrowRight,
  AtSign,
  Camera,
  Play,
} from 'lucide-react';

import { anchoContenido } from './ElementosComunes.jsx';

import logoBlanco from '../../assets/parroquia/logos/logo-horizontal-blanco.svg';

function Encabezado() {
  return (
    <>
      {/* Barra superior de información */}
      <div className="border-b border-white/10 bg-deep/70">
        <div
          className={`${anchoContenido} flex min-h-11 items-center justify-between gap-3 text-[11px] text-white/85 md:text-sm`}
        >
          {/* Horario destacado */}
          <div className="flex items-center gap-2">
            <Clock3 size={15} className="shrink-0" />

            <span>
              Hoy, sábado: Santa Misa 7:00 · 18:00
              {' '}(vespertina dominical)
            </span>
          </div>

          {/* Contacto y redes sociales */}
          <div className="hidden items-center gap-5 lg:flex">
            <span className="flex items-center gap-2 whitespace-nowrap">
              <Phone size={15} />
              (2) 278 0000
            </span>

            <span className="flex items-center gap-2 whitespace-nowrap">
              <MessageCircle size={15} />
              WhatsApp Secretaría
            </span>

            <span className="h-4 w-px bg-white/40" />

            {/* Iconos provisionales para redes sociales */}
            <div className="flex items-center gap-4">
              <AtSign size={16} />
              <Camera size={16} />
              <Play size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Encabezado principal */}
      <header
        className={`${anchoContenido} flex min-h-[110px] items-center justify-between gap-5 border-b border-white/20 text-white`}
      >
        {/* Logotipo oficial */}
        <div className="flex shrink-0 items-center">
          <img
            src={logoBlanco}
            alt="Parroquia Señor de la Exaltación"
            className="h-auto w-[170px] object-contain md:w-[205px]"
          />
        </div>

        {/* Navegación visual */}
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-5 text-[13px] font-medium lg:flex"
        >
          <span className="flex items-center gap-1 whitespace-nowrap">
            Nosotros
            <ChevronDown size={14} />
          </span>

          <span className="flex items-center gap-1 whitespace-nowrap">
            Sacramentos
            <ChevronDown size={14} />
          </span>

          <span className="flex items-center gap-1 whitespace-nowrap">
            Comunidad
            <ChevronDown size={14} />
          </span>

          <span>Noticias</span>
          <span>Calendario</span>
          <span>Contacto</span>
        </nav>

        {/* Búsqueda y botón destacado */}
        <div className="hidden items-center gap-4 xl:flex">
          <Search size={19} className="shrink-0" />

          <span className="static-cta whitespace-nowrap">
            Horarios de misa
            <ArrowRight size={17} />
          </span>
        </div>

        {/* Menú visual para móviles */}
        <span className="text-xs font-semibold uppercase tracking-widest text-gold lg:hidden">
          Menú
        </span>
      </header>
    </>
  );
}

export default Encabezado;
