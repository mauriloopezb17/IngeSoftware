// Secciones del panel, en el orden del índice de docs/api/admin.md.
// `ruta` es relativa a /admin. Qué rol puede ver cada una lo decide permisos/matriz.js.
import {
  Building2,
  CalendarDays,
  Church,
  Clock3,
  FileText,
  History,
  House,
  Images,
  LayoutTemplate,
  Newspaper,
  ScrollText,
  UserCog,
  Users,
  Video,
} from 'lucide-react';

export const SECCIONES = [
  { clave: 'inicio', ruta: 'inicio', titulo: 'Inicio', icono: House },
  { clave: 'publicaciones', ruta: 'publicaciones', titulo: 'Publicaciones', icono: Newspaper },
  { clave: 'eventos', ruta: 'eventos', titulo: 'Eventos', icono: CalendarDays },
  { clave: 'horarios', ruta: 'horarios', titulo: 'Horarios', icono: Clock3 },
  { clave: 'servicios', ruta: 'servicios', titulo: 'Servicios', icono: Church },
  { clave: 'grupos', ruta: 'grupos', titulo: 'Grupos pastorales', icono: Users },
  { clave: 'videos', ruta: 'videos', titulo: 'Videos', icono: Video },
  { clave: 'multimedia', ruta: 'multimedia', titulo: 'Multimedia', icono: Images },
  { clave: 'sedes', ruta: 'sedes', titulo: 'Sedes', icono: Building2 },
  { clave: 'proclamas', ruta: 'proclamas', titulo: 'Proclamas', icono: ScrollText },
  { clave: 'boletines', ruta: 'boletines', titulo: 'Boletines', icono: FileText },
  { clave: 'paginas', ruta: 'paginas', titulo: 'Páginas', icono: LayoutTemplate },
  { clave: 'bitacora', ruta: 'bitacora', titulo: 'Bitácora', icono: History },
  { clave: 'usuarios', ruta: 'usuarios', titulo: 'Usuarios', icono: UserCog },
];
