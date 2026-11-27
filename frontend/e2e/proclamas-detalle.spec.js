import { expect, test } from '@playwright/test';
import { eliminarProclamaAdmin } from './helpers/limpieza.js';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Detalle de proclamas', () => {
  test.beforeEach(() => {
    test.setTimeout(180_000);
  });
  test('Marketing agrega fotos y descripción a una proclama → el visitante la abre desde /proclamas y las ve', async ({
    browser,
    page,
  }) => {
    const novio = tituloUnico('Novio E2E');
    const novia = 'María E2E';
    const descripcion = tituloUnico('Invitación fraterna de ejemplo');

    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    let proclamaUrl;
    try {
      await secretaria.page.goto('/admin/proclamas/nueva');
      await secretaria.page.getByLabel('Contrayente 1').fill(novio);
      await secretaria.page.getByLabel('Contrayente 2').fill(novia);
      await secretaria.page.getByLabel('Fecha y hora del matrimonio').fill('2032-12-05T11:00');
      await secretaria.page.getByLabel('Primera proclama (opcional)').fill('2020-10-25');
      await secretaria.page.getByRole('button', { name: 'Crear proclama' }).click();

      await expect(secretaria.page).toHaveURL(/\/admin\/proclamas\/\d+\/editar/);
      proclamaUrl = secretaria.page.url();
    } finally {
      await secretaria.context.close();
    }

    const idProclama = proclamaUrl.match(/\/admin\/proclamas\/(\d+)\/editar/)[1];

    try {
      const marketing = await abrirContextoConRol(browser, 'marketing');
      try {
        await marketing.page.goto(`/admin/proclamas/${idProclama}/editar`);
        await expect(
          marketing.page.getByRole('heading', { name: 'Página de la proclama' }),
        ).toBeVisible();

        // Elegir foto principal
        await marketing.page.getByRole('button', { name: 'Elegir foto' }).click();
        const dialogoFoto = marketing.page.getByRole('dialog', {
          name: 'Elegir foto de los novios',
        });
        await expect(dialogoFoto).toBeVisible();
        const listaFoto = dialogoFoto.getByRole('list', { name: 'Imágenes' });
        await listaFoto.getByRole('button').first().click();
        await dialogoFoto.getByRole('button', { name: 'Usar esta imagen' }).click();
        await expect(dialogoFoto).toBeHidden();

        // Agregar a la galería
        await marketing.page.getByRole('button', { name: 'Agregar a la galería' }).click();
        const dialogoGaleria = marketing.page.getByRole('dialog', {
          name: 'Agregar foto o video a la galería',
        });
        await expect(dialogoGaleria).toBeVisible();
        const listaGaleria = dialogoGaleria.getByRole('list', { name: 'Archivos disponibles' });
        await listaGaleria.getByRole('button').first().click();
        await dialogoGaleria.getByRole('button', { name: 'Agregar a la galería' }).click();
        await expect(dialogoGaleria).toBeHidden();

        // Descripción en BlockNote
        const editor = marketing.page
          .getByRole('group', { name: 'Descripción de la proclama' })
          .locator('[contenteditable="true"]')
          .first();
        await expect(editor).toBeVisible();
        await editor.click();
        await marketing.page.keyboard.type(descripcion);

        await marketing.page.getByRole('button', { name: 'Guardar página' }).click();
        await expect(marketing.page.getByText('Página de la proclama guardada.')).toBeVisible();
      } finally {
        await marketing.context.close();
      }

      // Visitante abre la proclama desde /proclamas
      await page.goto('/proclamas');
      const enlace = page.getByRole('link', { name: `${novio} & ${novia}` }).first();
      await expect(enlace).toBeVisible();
      await enlace.click();

      await expect(page).toHaveURL(new RegExp(`/proclamas/${idProclama}$`));
      await expect(
        page.getByRole('heading', { level: 1, name: `${novio} y ${novia}` }),
      ).toBeVisible();
      await expect(page.getByText(descripcion)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Fotos y videos' })).toBeVisible();
    } finally {
      await eliminarProclamaAdmin(browser, idProclama);
    }
  });
});
