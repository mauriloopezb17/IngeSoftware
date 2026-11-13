// Punto de entrada del panel CMS (/admin/*). Se carga de forma diferida:
// el portal público no descarga este código. Las rutas son relativas a /admin.
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';

import { queryClient } from '../services/queryClient.js';
import GuardiaSeccion from './componentes/GuardiaSeccion.jsx';
import LayoutPanel from './componentes/LayoutPanel.jsx';
import PantallaProvisional from './componentes/PantallaProvisional.jsx';
import RutaProtegida from './componentes/RutaProtegida.jsx';
import Inicio from './paginas/Inicio.jsx';
import InicioSesion from './paginas/InicioSesion.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';
import { SECCIONES } from './rutas.js';
import { SesionProvider } from './sesion/SesionProvider.jsx';

function AdminApp() {
  return (
    // Es el mismo QueryClient que monta App.jsx; se declara aquí para que el panel también
    // funcione fuera de App (pruebas de enrutado).
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Routes>
          <Route path="login" element={<InicioSesion />} />
          <Route element={<RutaProtegida />}>
            <Route element={<LayoutPanel />}>
              <Route index element={<Navigate to="inicio" replace />} />
              <Route path="inicio" element={<Inicio />} />
              {/* Una ruta por sección del índice de admin.md; cada una pasa por su guardia de permisos. */}
              {SECCIONES.filter((s) => s.clave !== 'inicio').map(({ clave, ruta, titulo }) => (
                <Route key={clave} path={ruta} element={<GuardiaSeccion clave={clave} />}>
                  <Route index element={<PantallaProvisional titulo={titulo} />} />
                </Route>
              ))}
              <Route path="*" element={<NoEncontrada />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </QueryClientProvider>
  );
}

export default AdminApp;
