// Punto de entrada del panel CMS (/admin/*). Se carga de forma diferida:
// el portal público no descarga este código. Las rutas son relativas a /admin.
import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router';

import { queryClient } from '../services/queryClient.js';
import Inicio from './paginas/Inicio.jsx';
import InicioSesion from './paginas/InicioSesion.jsx';
import { SesionProvider } from './sesion/SesionProvider.jsx';

function AdminApp() {
  return (
    // Es el mismo QueryClient que monta App.jsx; se declara aquí para que el panel también
    // funcione fuera de App (pruebas de enrutado).
    <QueryClientProvider client={queryClient}>
      <SesionProvider>
        <Routes>
          <Route path="login" element={<InicioSesion />} />
          <Route path="inicio" element={<Inicio />} />
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </SesionProvider>
    </QueryClientProvider>
  );
}

export default AdminApp;
