
import '../styles/parroquia.css';

import { usePagina } from '../hooks/index.js';
import Portada from '../components/parroquia/Portada.jsx';
import Nosotros from '../components/parroquia/Nosotros.jsx';
import Horarios from '../components/parroquia/Horarios.jsx';
import Sacramentos from '../components/parroquia/Sacramentos.jsx';
import Agenda from '../components/parroquia/Agenda.jsx';
import VidaParroquial from '../components/parroquia/VidaParroquial.jsx';
import Proclamas from '../components/parroquia/Proclamas.jsx';
import VideoInstitucional from '../components/parroquia/VideoInstitucional.jsx';
import GruposPastorales from '../components/parroquia/GruposPastorales.jsx';
import Comunidades from '../components/parroquia/Comunidades.jsx';
import Contacto from '../components/parroquia/Contacto.jsx';
import PiePagina from '../components/parroquia/PiePagina.jsx';

const DESCRIPCION_INICIO_DEFECTO =
  'Parroquia Señor de la Exaltación, comunidad pasionista en Obrajes, La Paz: horarios de misa, sacramentos, agenda y vida parroquial.';

function InicioParroquia() {
  const { data: paginaInicio } = usePagina('inicio');
  const descripcion = paginaInicio?.descripcionSeo || DESCRIPCION_INICIO_DEFECTO;

  return (
    <main className="font-body">
      <title>Inicio | Parroquia Señor de la Exaltación</title>
      <meta name="description" content={descripcion} />
      <Portada />
      <Nosotros />
      <Horarios />
      <Sacramentos />
      <Agenda />
      <VidaParroquial />
      <Proclamas />
      <VideoInstitucional />
      <GruposPastorales />
      <Comunidades />
      <Contacto />
      <PiePagina />
    </main>
  );
}

export default InicioParroquia;
