import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

async function iniciar() {
  // Con VITE_USAR_MOCKS=true la API se simula en el navegador (sin backend).
  // En producción esta rama se elimina del build.
  if (import.meta.env.VITE_USAR_MOCKS === 'true') {
    const { iniciarMocks } = await import('./mocks/browser.js');
    await iniciarMocks();
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

iniciar();
