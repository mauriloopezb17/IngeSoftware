import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

import { server } from '../mocks/server.js';

// Cualquier llamada a la API sin handler falla la prueba: así no hay peticiones
// reales ni dependencias ocultas entre pruebas.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Vitest no expone afterEach como global, así que la limpieza del DOM
// entre pruebas se registra de forma explícita.
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
