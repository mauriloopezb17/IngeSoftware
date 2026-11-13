// Pantallas del contenido de la parroquia en el panel (Sección D): horarios, servicios,
// grupos pastorales, videos y sedes. Por clave de sección de rutas.js.
import Grupos from './grupos/Grupos.jsx';
import Horarios from './horarios/Horarios.jsx';
import Sedes from './sedes/Sedes.jsx';
import Servicios from './servicios/Servicios.jsx';
import Videos from './videos/Videos.jsx';

export const pantallasContenido = {
  horarios: <Horarios />,
  servicios: <Servicios />,
  grupos: <Grupos />,
  videos: <Videos />,
  sedes: <Sedes />,
};
