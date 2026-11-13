// Pantallas de la Sección C en el panel, por clave de sección de rutas.js. Todas manejan sus
// propias subrutas (nuevo, :id/editar...): AdminApp las monta en /admin/<ruta>/*.
import Eventos from '../eventos/Eventos.jsx';
import Publicaciones from './Publicaciones.jsx';

export const pantallasPublicaciones = {
  publicaciones: <Publicaciones />,
  eventos: <Eventos />,
};
