import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest no expone afterEach como global, así que la limpieza del DOM
// entre pruebas se registra de forma explícita.
afterEach(() => {
  cleanup();
});
