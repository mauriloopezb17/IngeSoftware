import { createBrowserRouter } from 'react-router';

import InicioParroquia from './pages/InicioParroquia.jsx';
import Noticias from './pages/Noticias.jsx';
import NoticiaDetalle from './pages/NoticiaDetalle.jsx';
import Proclamas from './pages/Proclamas.jsx';
import Calendario from './pages/Calendario.jsx';
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
      { path: '/', Component: InicioParroquia },
      { path: '/noticias', Component: Noticias },
      { path: '/noticias/:slug', Component: NoticiaDetalle },
      { path: '/proclamas', Component: Proclamas },
      { path: '/calendario', Component: Calendario },
      // El panel define sus propias subrutas dentro de AdminApp.
      { path: '/admin/*', lazy: cargarAdmin },
      { path: '*', Component: NoEncontrado },
    ],
  },
];

export const router = createBrowserRouter(rutas);
