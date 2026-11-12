import { setupServer } from 'msw/node';

import { handlers } from './handlers/index.js';

// Servidor de mocks para las pruebas (Vitest).
export const server = setupServer(...handlers);
