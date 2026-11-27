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
  await expect(page.locator('#noticias')).toBeVisible();
  await expect(page.locator('#proclamas')).toBeVisible();
  await expect(page.locator('footer')).toBeVisible();
}

test.beforeEach(() => {
  test.setTimeout(90_000);
});

test('inicio carga todas sus secciones en escritorio sin errores de consola', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { erroresConsola, erroresPagina } = capturarErrores(page);

  await page.goto('/');
  await verificarSeccionesInicio(page);

  const anchoScroll = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(anchoScroll).toBeLessThanOrEqual(1280);
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

test('rutas internas multipágina cargan sin errores ni desbordamiento en escritorio y móvil', async ({
  page,
}) => {
  const rutasEsperadas = [
    { ruta: '/nosotros', titulo: 'Quiénes somos' },
    { ruta: '/horarios', titulo: 'Horarios de misa y secretaría' },
    { ruta: '/sacramentos', titulo: 'Sacramentos y catequesis' },
    { ruta: '/sacramentos/bautismo', titulo: 'Bautismo' },
    { ruta: '/comunidad', titulo: 'Grupos y pastorales' },
    { ruta: '/contacto', titulo: 'Visítanos o escríbenos' },
    { ruta: '/calendario', titulo: 'Calendario de eventos' },
    { ruta: '/proclamas', titulo: 'Proclamas matrimoniales' },
    { ruta: '/boletines', titulo: 'Boletines parroquiales' },
    { ruta: '/paginas/nosotros', titulo: 'Quiénes somos' },
  ];

  const { erroresConsola, erroresPagina } = capturarErrores(page);

  for (const { width, height } of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width, height });
    for (const { ruta, titulo } of rutasEsperadas) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      const anchoScroll = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(anchoScroll).toBeLessThanOrEqual(width);
    }
  }

  expect(erroresPagina).toEqual([]);
  expect(erroresConsola).toEqual([]);
});

test('noticias muestra listado, detalle por slug y pantalla de slug inexistente', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const { erroresConsola, erroresPagina } = capturarErrores(page);

  await page.goto('/noticias');
  const primerEnlace = page.getByRole('link', {
    name: 'Leer publicación: Primeras comuniones: 42 niños recibieron a Jesús',
  });
  await expect(primerEnlace).toBeVisible();
  const href = await primerEnlace.getAttribute('href');

  await primerEnlace.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('article')).toBeVisible();

  // «Leer nota» en una publicación con urlExterna (sin enlace directo) abre el detalle
  // y muestra el botón secundario «Ver publicación original».
  await page.goto('/noticias');
  const leerNotaConExterno = page.getByRole('link', {
    name: /Leer publicación: Encuentro de Pastoral Familiar: Cuando la muerte llega a la familia/,
  });
  await expect(leerNotaConExterno).toHaveAttribute(
    'href',
    '/noticias/encuentro-pastoral-familiar-duelo',
  );
  await leerNotaConExterno.click();
  await expect(page).toHaveURL(/\/noticias\/encuentro-pastoral-familiar-duelo$/);
  const verOriginal = page.getByRole('link', { name: /Ver publicación original/ });
  await expect(verOriginal).toBeVisible();
  await expect(verOriginal).toHaveAttribute('target', '_blank');
  await expect(verOriginal).toHaveAttribute('rel', 'noopener noreferrer');

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
