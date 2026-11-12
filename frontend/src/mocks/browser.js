import { setupWorker } from 'msw/browser';

import { handlers } from './handlers/index.js';

const worker = setupWorker(...handlers);

// Solo se importa cuando VITE_USAR_MOCKS=true (ver main.jsx).
export function iniciarMocks() {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: '/mockServiceWorker.js' },
  });
}
