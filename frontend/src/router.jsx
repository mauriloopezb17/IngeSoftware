import { createBrowserRouter } from 'react-router';

import LayoutPortal from './components/portal/LayoutPortal.jsx';
import InicioParroquia from './pages/InicioParroquia.jsx';
import NosotrosPagina from './pages/NosotrosPagina.jsx';
import HorariosPagina from './pages/HorariosPagina.jsx';
import SacramentosPagina from './pages/SacramentosPagina.jsx';
import SacramentoDetalle from './pages/SacramentoDetalle.jsx';
import ComunidadPagina from './pages/ComunidadPagina.jsx';
import ContactoPagina from './pages/ContactoPagina.jsx';
import Noticias from './pages/Noticias.jsx';
import NoticiaDetalle from './pages/NoticiaDetalle.jsx';
import Proclamas from './pages/Proclamas.jsx';
import Calendario from './pages/Calendario.jsx';
import CalendarioDia from './pages/CalendarioDia.jsx';
import Boletines from './pages/Boletines.jsx';
import EventoDetalle from './pages/EventoDetalle.jsx';
import PaginaPublica from './pages/PaginaPublica.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';
import CargandoPagina from './pages/CargandoPagina.jsx';

// El panel CMS se descarga solo cuando alguien entra a /admin.
async function cargarAdmin() {
  const { default: AdminApp } = await import('./admin/AdminApp.jsx');
  return { Component: AdminApp };
}

export const rutas = [
  {
    // Ruta sin ruta propia: solo aporta la pantalla de carga inicial.
    HydrateFallback: CargandoPagina,
    children: [
      {
        Component: LayoutPortal,
        children: [
          { path: '/', Component: InicioParroquia },
          { path: '/nosotros', Component: NosotrosPagina },
          { path: '/horarios', Component: HorariosPagina },
          { path: '/sacramentos', Component: SacramentosPagina },
          { path: '/sacramentos/:slug', Component: SacramentoDetalle },
          { path: '/comunidad', Component: ComunidadPagina },
          { path: '/contacto', Component: ContactoPagina },
          { path: '/noticias', Component: Noticias },
          { path: '/noticias/:slug', Component: NoticiaDetalle },
          { path: '/proclamas', Component: Proclamas },
          { path: '/calendario', Component: Calendario },
          { path: '/calendario/dia/:fecha', Component: CalendarioDia },
          { path: '/calendario/:id', Component: EventoDetalle },
          { path: '/boletines', Component: Boletines },
          { path: '/paginas/:slug', Component: PaginaPublica },
          { path: '*', Component: NoEncontrado },
        ],
      },
      // El panel define sus propias subrutas dentro de AdminApp.
      { path: '/admin/*', lazy: cargarAdmin },
    ],
  },
];

export const router = createBrowserRouter(rutas);
