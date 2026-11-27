import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

const NOMBRE_GRUPO = 'Coro Parroquial';
const SLUG_GRUPO = 'coro-parroquial';

test.describe('Noticias relacionadas con sacramentos y grupos', () => {
  test('Marketing etiqueta una noticia con un grupo y el Párroco aprueba → aparece en la página del grupo y el chip de la noticia lleva al grupo', async ({
    browser,
    page,
  }) => {
    const titulo = tituloUnico('Noticia grupo E2E');
    const resumen = 'Resumen breve de prueba para noticias relacionadas.';
    const cuerpo = 'Cuerpo de noticia de prueba vinculada al coro parroquial.';
    let publicacionId = null;

    const marketing = await abrirContextoConRol(browser, 'marketing');
    try {
      await marketing.page.goto('/admin/publicaciones');
      await marketing.page.getByRole('link', { name: 'Nueva publicación' }).click();
      await expect(marketing.page).toHaveURL(/\/admin\/publicaciones\/nueva/);

      await marketing.page.getByLabel('Título').fill(titulo);
      await marketing.page.getByLabel('Resumen').fill(resumen);

      const editor = marketing.page
        .getByRole('group', { name: 'Contenido de la publicación' })
        .locator('[contenteditable="true"]')
        .first();
      await expect(editor).toBeVisible();
      await editor.click();
      await marketing.page.keyboard.type(cuerpo);

      const casillaGrupo = marketing.page.getByRole('checkbox', { name: NOMBRE_GRUPO });
      await expect(casillaGrupo).toBeVisible();
      await casillaGrupo.check();

      const [respuestaCrear] = await Promise.all([
        marketing.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/publicaciones') && res.request().method() === 'POST',
        ),
        marketing.page.getByRole('button', { name: 'Guardar borrador' }).click(),
      ]);
      const creada = await respuestaCrear.json();
      publicacionId = creada?.datos?.id ?? null;

      await expect(marketing.page).toHaveURL(/\/admin\/publicaciones\/\d+\/editar/);
      await marketing.page.getByRole('button', { name: 'Enviar a revisión' }).click();
      const dialogoEnvio = marketing.page.getByRole('dialog', { name: 'Enviar a revisión' });
      await expect(dialogoEnvio).toBeVisible();
      await dialogoEnvio.getByRole('button', { name: 'Enviar a revisión' }).click();
      await expect(dialogoEnvio).toBeHidden();
    } finally {
      await marketing.context.close();
    }

    try {
      const parroco = await abrirContextoConRol(browser, 'parroco');
      try {
        await parroco.page.goto('/admin/publicaciones/revision');
        const fila = parroco.page.getByRole('row', { name: new RegExp(titulo) });
        await expect(fila).toBeVisible();

        await fila.getByRole('button', { name: `Aprobar «${titulo}»` }).click();
        const dialogoAprobar = parroco.page.getByRole('dialog', { name: 'Aprobar publicación' });
        await expect(dialogoAprobar).toBeVisible();
        await dialogoAprobar.getByRole('button', { name: 'Aprobar y publicar' }).click();
        await expect(dialogoAprobar).toBeHidden();
        await expect(fila).toBeHidden();
      } finally {
        await parroco.context.close();
      }

      await page.goto(`/comunidad/grupos/${SLUG_GRUPO}`);
      await expect(
        page.getByRole('heading', { level: 2, name: 'Noticias relacionadas' }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { level: 3, name: titulo })).toBeVisible();

      await page.getByRole('link', { name: `Leer publicación: ${titulo}` }).click();
      await expect(page).toHaveURL(/\/noticias\/.+/);
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await expect(page.getByText('Relacionada con:')).toBeVisible();

      const chipGrupo = page.getByRole('link', { name: NOMBRE_GRUPO });
      await expect(chipGrupo).toBeVisible();
      await chipGrupo.click();
      await expect(page).toHaveURL(new RegExp(`/comunidad/grupos/${SLUG_GRUPO}$`));
    } finally {
      if (publicacionId) {
        const limpieza = await abrirContextoConRol(browser, 'parroco');
        try {
          await limpieza.page.request.post(`/api/admin/publicaciones/${publicacionId}/archivar`);
          await limpieza.page.request.delete(`/api/admin/publicaciones/${publicacionId}`);
        } finally {
          await limpieza.context.close();
        }
      }
    }
  });
});
