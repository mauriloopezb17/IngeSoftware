import { expect, test } from '@playwright/test';

test.describe('Portal público: filtros y paginación de noticias', () => {
  test('filtra por categoría o tipo, conserva la URL al recargar y permite quitar filtros', async ({
    page,
  }) => {
    await page.goto('/noticias');
    await expect(page.getByRole('heading', { level: 1, name: 'Noticias' })).toBeVisible();

    // Filtrar por tipo "Notas de prensa"
    await page.getByRole('button', { name: 'Notas de prensa' }).click();
    await expect(page).toHaveURL(/tipo=NOTA_DE_PRENSA/);

    // Recargar la página y comprobar que el filtro se conserva desde la URL
    await page.reload();
    await expect(page.getByRole('button', { name: 'Notas de prensa' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Buscar texto sin resultados y usar "Quitar filtros"
    await page.getByRole('searchbox', { name: 'Buscar noticias' }).fill('termino-sin-coincidencia');
    await expect(page).toHaveURL(/buscar=termino-sin-coincidencia/);
    await expect(
      page.getByText('No hay noticias que coincidan con los filtros seleccionados.'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Quitar filtros' }).first().click();
    await expect(page).toHaveURL(/\/noticias$/);
  });
});
