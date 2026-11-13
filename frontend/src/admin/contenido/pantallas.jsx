// Pantallas del contenido de la parroquia en el panel (Sección D): horarios, servicios,
// grupos pastorales, videos, sedes y páginas. Por clave de sección de rutas.js.
import SeccionSimple from '../componentes/SeccionSimple.jsx';
import Grupos from './grupos/Grupos.jsx';
import Horarios from './horarios/Horarios.jsx';
import Paginas from './paginas/Paginas.jsx';
import Sedes from './sedes/Sedes.jsx';
import Servicios from './servicios/Servicios.jsx';
import Videos from './videos/Videos.jsx';
import Bitacora from '../bitacora/Bitacora.jsx';
import Usuarios from '../usuarios/Usuarios.jsx';

// Páginas ya tiene subrutas (/admin/paginas/:id). Las demás van en <SeccionSimple> hasta que las necesiten.
const simple = (pantalla) => <SeccionSimple>{pantalla}</SeccionSimple>;

export const pantallasContenido = {
  horarios: simple(<Horarios />),
  servicios: simple(<Servicios />),
  grupos: simple(<Grupos />),
  videos: simple(<Videos />),
  sedes: simple(<Sedes />),
  paginas: <Paginas />,
  bitacora: simple(<Bitacora />),
  usuarios: simple(<Usuarios />),
};
