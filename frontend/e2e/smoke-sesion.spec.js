// Prueba base de humo: verifica arranque real sin mocks e inicio de sesión en el panel.
import { expect, test } from '@playwright/test';
import { iniciarSesion } from './helpers/sesion.js';

test('el frontend se conecta al backend real sin mocks y permite iniciar sesión', async ({
  page,
}) => {
  const salud = await page.request.get('/api/salud');
  expect(salud.ok()).toBe(true);

  await iniciarSesion(page, 'admin');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
