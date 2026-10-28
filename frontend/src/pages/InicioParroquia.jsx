
import '../styles/parroquia.css';

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

function InicioParroquia() {
  return (
    <main className="font-body">
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
