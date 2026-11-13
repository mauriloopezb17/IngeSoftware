// Pantallas del contenido de la parroquia en el panel (Sección D): horarios, servicios,
// grupos pastorales, videos, sedes y páginas. Por clave de sección de rutas.js.
import Grupos from './grupos/Grupos.jsx';
import Horarios from './horarios/Horarios.jsx';
import Paginas from './paginas/Paginas.jsx';
import Sedes from './sedes/Sedes.jsx';
import Servicios from './servicios/Servicios.jsx';
import Videos from './videos/Videos.jsx';
import Bitacora from '../bitacora/Bitacora.jsx';
import Usuarios from '../usuarios/Usuarios.jsx';

export const pantallasContenido = {
  horarios: <Horarios />,
  servicios: <Servicios />,
  grupos: <Grupos />,
  videos: <Videos />,
  sedes: <Sedes />,
  paginas: <Paginas />,
  bitacora: <Bitacora />,
  usuarios: <Usuarios />,
};
