// Punto de entrada del panel CMS (/admin/*). Se carga de forma diferida:
// el portal público no descarga este código. Las rutas son relativas a /admin.
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';

import { queryClient } from '../services/queryClient.js';
import GuardiaSeccion from './componentes/GuardiaSeccion.jsx';
import { pantallasContenido } from './contenido/pantallas.jsx';
import LayoutPanel from './componentes/LayoutPanel.jsx';
import PantallaProvisional from './componentes/PantallaProvisional.jsx';
import RutaProtegida from './componentes/RutaProtegida.jsx';
import Inicio from './paginas/Inicio.jsx';
import InicioSesion from './paginas/InicioSesion.jsx';
import Multimedia from './paginas/Multimedia.jsx';
import NoEncontrada from './paginas/NoEncontrada.jsx';
import { pantallasPublicaciones } from './publicaciones/pantallas.jsx';
import { SECCIONES } from './rutas.js';
import { SesionProvider } from './sesion/SesionProvider.jsx';

// Secciones que ya tienen su pantalla; el resto muestra la pantalla provisional.
// Cada área registra las suyas en su propio archivo para no editar este.
const PANTALLAS = {
  multimedia: <Multimedia />,
  ...pantallasPublicaciones,
  ...pantallasContenido,
};

// Las pantallas de publicaciones manejan sus subrutas (nueva, :id, :id/editar, revision).
const SECCIONES_CON_SUBRUTAS = new Set(Object.keys(pantallasPublicaciones));

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
              {SECCIONES.filter((s) => s.clave !== 'inicio').map(({ clave, ruta, titulo }) => {
                const pantalla = PANTALLAS[clave] ?? <PantallaProvisional titulo={titulo} />;
                return (
                  <Route key={clave} path={ruta} element={<GuardiaSeccion clave={clave} />}>
                    {/* Las secciones con subrutas (publicaciones) declaran sus propias <Routes> relativas;
                        el resto solo responde en su raíz y cualquier otra subruta es «no encontrada». */}
                    {SECCIONES_CON_SUBRUTAS.has(clave) ? (
                      <>
                        <Route index element={pantalla} />
                        <Route path="*" element={pantalla} />
                      </>
                    ) : (
                      <Route index element={pantalla} />
                    )}
                  </Route>
                );
              })}
              <Route path="*" element={<NoEncontrada />} />
            </Route>
          </Route>
        </Routes>
      </SesionProvider>
    </QueryClientProvider>
  );
}

export default AdminApp;
