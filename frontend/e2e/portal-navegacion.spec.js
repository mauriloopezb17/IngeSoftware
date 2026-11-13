// Pruebas end-to-end de navegación y carga del portal público contra la API real.
import { expect, test } from '@playwright/test';

function capturarErrores(page) {
  const erroresConsola = [];
  const erroresPagina = [];

  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') erroresConsola.push(mensaje.text());
  });
  page.on('pageerror', (error) => {
    erroresPagina.push(error.message);
  });

  return { erroresConsola, erroresPagina };
}

async function verificarSeccionesInicio(page) {
  await expect(page.locator('#inicio h1')).toBeVisible();
  await expect(page.locator('#nosotros')).toBeVisible();
  await expect(page.locator('#horarios')).toContainText('Santa Misa');
  await expect(page.locator('#sacramentos')).toContainText('Bautismo');
  await expect(page.locator('#agenda')).toBeVisible();
  await expect(page.locator('#comunidad')).toContainText('Monaguillos');
  await expect(page.locator('#comunidades')).toBeVisible();
  await expect(page.locator('#contacto')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
}

test('inicio carga todas sus secciones en escritorio sin errores de consola', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { erroresConsola, erroresPagina } = capturarErrores(page);

  await page.goto('/');
  await verificarSeccionesInicio(page);

  expect(erroresPagina).toEqual([]);
  expect(erroresConsola).toEqual([]);
});

test('inicio carga todas sus secciones en móvil (390 px) sin desbordamiento ni errores', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { erroresConsola, erroresPagina } = capturarErrores(page);

  await page.goto('/');
  await verificarSeccionesInicio(page);

  const anchoScroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoScroll).toBeLessThanOrEqual(390);
  expect(erroresPagina).toEqual([]);
  expect(erroresConsola).toEqual([]);
});

test('noticias muestra listado, detalle por slug y pantalla de slug inexistente', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { erroresConsola, erroresPagina } = capturarErrores(page);

  await page.goto('/noticias');
  const primerEnlace = page.locator('main a[href^="/noticias/"]').first();
  await expect(primerEnlace).toBeVisible();
  const href = await primerEnlace.getAttribute('href');

  await primerEnlace.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('article')).toBeVisible();

  expect(erroresPagina).toEqual([]);
  expect(erroresConsola).toEqual([]);

  // Navegar a un slug inexistente muestra el estado de publicación no disponible.
  await page.goto('/noticias/slug-que-no-existe-e2e');
  await expect(
    page.getByRole('heading', { level: 1, name: 'No encontramos esta noticia' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Ver todas las noticias' }).click();
  await expect(page).toHaveURL(/\/noticias$/);
  expect(erroresPagina).toEqual([]);
});
