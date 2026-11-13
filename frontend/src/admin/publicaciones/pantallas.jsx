// Pantallas de la Sección C en el panel, por clave de sección de rutas.js. Todas manejan sus
// propias subrutas (nuevo, :id/editar...): AdminApp las monta en /admin/<ruta>/*.
import Boletines from '../boletines/Boletines.jsx';
import Eventos from '../eventos/Eventos.jsx';
import Proclamas from '../proclamas/Proclamas.jsx';
import Publicaciones from './Publicaciones.jsx';

export const pantallasPublicaciones = {
  publicaciones: <Publicaciones />,
  eventos: <Eventos />,
  proclamas: <Proclamas />,
  boletines: <Boletines />,
};
