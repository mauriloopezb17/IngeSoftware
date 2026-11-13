// Helpers compartidos para las pruebas end-to-end con Playwright contra la API real.
import { expect } from '@playwright/test';

export const CONTRASENA_DEV = 'Parroquia2026!';

export const USUARIOS_POR_ROL = Object.freeze({
  admin: 'admin@parroquia.test',
  parroco: 'parroco@parroquia.test',
  secretaria: 'secretaria@parroquia.test',
  marketing: 'marketing@parroquia.test',
});

// Genera un texto único por ejecución para que cada prueba sea independiente y repetible.
export function tituloUnico(prefijo) {
  const sufijo = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return `${prefijo} ${sufijo}`;
}

// Inicia sesión en el panel usando el formulario real contra /api/auth/login.
export async function iniciarSesion(page, rol) {
  const correo = USUARIOS_POR_ROL[rol];
  if (!correo) throw new Error(`Rol desconocido en helper E2E: ${rol}`);

  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA_DEV);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL(/\/admin\/inicio/);
}

// Abre un contexto de navegador aislado ya autenticado con el rol indicado.
export async function abrirContextoConRol(browser, rol) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await iniciarSesion(page, rol);
  return { context, page };
}
