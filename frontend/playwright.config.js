import { defineConfig, devices } from '@playwright/test';

// Puertos de las e2e. En el CI son siempre 3000 (API) y 5173 (portal). En local se pueden cambiar con
// E2E_PUERTO_API y E2E_PUERTO_WEB para correrlas sin detener otro backend o Vite de la misma máquina.
const PUERTO_API = process.env.E2E_PUERTO_API || '3000';
const PUERTO_WEB = process.env.E2E_PUERTO_WEB || '5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    locale: 'es-BO',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: `http://localhost:${PUERTO_API}/api/salud`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: PUERTO_API,
        // La API solo acepta peticiones del origen del portal de las pruebas (CORS y CSRF).
        CORS_ORIGEN: `http://localhost:${PUERTO_WEB}`,
      },
    },
    {
      command: `npx vite --port ${PUERTO_WEB} --strictPort`,
      cwd: '.',
      url: `http://localhost:${PUERTO_WEB}`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        ...process.env,
        VITE_USAR_MOCKS: 'false',
        VITE_API_URL: '/api',
      },
    },
  ],
});
