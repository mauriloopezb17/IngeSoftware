import {
  BookOpen,
  CalendarDays,
  CircleDot,
  Clock3,
  Cross,
  Droplet,
  Flame,
  HeartHandshake,
  HeartPulse,
  Music2,
  ScrollText,
  Star,
  Sun,
  Users,
} from 'lucide-react';

import {
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaTiktok,
  FaWhatsapp,
  FaYoutube,
} from 'react-icons/fa';

const ICONOS_LUCIDE = {
  'book-open': BookOpen,
  'calendar-days': CalendarDays,
  'clock-3': Clock3,
  cross: Cross,
  droplet: Droplet,
  flame: Flame,
  'heart-handshake': HeartHandshake,
  'heart-pulse': HeartPulse,
  'music-2': Music2,
  'scroll-text': ScrollText,
  star: Star,
  sun: Sun,
  users: Users,
};

const ICONOS_REDES = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  chat: FaWhatsapp,
};

export function IconoDinamico({
  nombre,
  size = 20,
  strokeWidth = 1.8,
  className,
  respaldo: IconoRespaldo = CircleDot,
  ...props
}) {
  const Icono = (nombre && ICONOS_LUCIDE[nombre]) || IconoRespaldo;

  return (
    <Icono
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
}

export function IconoRedSocial({ nombre, size = 16, className, ...props }) {
  const Icono = (nombre && ICONOS_REDES[nombre]) || FaGlobe;

  return <Icono size={size} className={className} aria-hidden="true" {...props} />;
}
