import { expect, test } from '@playwright/test';

test.describe('Buscador del portal público', () => {
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });
  test('buscar "bautismo" desde el encabezado, filtrar por Sacramentos y abrir el resultado', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const botonBuscar = page.getByRole('button', { name: 'Buscar' });
    await botonBuscar.click();

    const campo = page.getByRole('searchbox', { name: 'Buscar en el portal' });
    await expect(campo).toBeFocused();
    await campo.fill('bautismo');
    await campo.press('Enter');

    await expect(page).toHaveURL(/\/buscar\?q=bautismo/);

    const tabSacramentos = page.getByRole('tab', { name: /Sacramentos/i });
    await expect(tabSacramentos).toBeVisible();
    await tabSacramentos.click();

    await expect(page).toHaveURL(/tipo=sacramento/);

    const enlaceResultado = page.locator('main a[href="/sacramentos/bautismo"]');
    await expect(enlaceResultado).toBeVisible();
    await enlaceResultado.click();

    await expect(page).toHaveURL(/\/sacramentos\/bautismo/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bautismo/i);
  });
});
