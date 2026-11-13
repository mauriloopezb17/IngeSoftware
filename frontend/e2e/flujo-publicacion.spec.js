import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

async function redactarYEnviarARevision(page, { titulo, resumen, cuerpo }) {
  await page.goto('/admin/publicaciones');
  await page.getByRole('link', { name: 'Nueva publicación' }).click();
  await expect(page).toHaveURL(/\/admin\/publicaciones\/nueva/);

  await page.getByLabel('Título').fill(titulo);
  await page.getByLabel('Resumen').fill(resumen);

  const editor = page
    .getByRole('group', { name: 'Contenido de la publicación' })
    .locator('[contenteditable="true"]')
    .first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.type(cuerpo);

  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(/\/admin\/publicaciones\/\d+\/editar/);

  await page.getByRole('button', { name: 'Enviar a revisión' }).click();
  const dialogoEnvio = page.getByRole('dialog', { name: 'Enviar a revisión' });
  await expect(dialogoEnvio).toBeVisible();
  await dialogoEnvio.getByRole('button', { name: 'Enviar a revisión' }).click();
  await expect(dialogoEnvio).toBeHidden();
}

test.describe('Flujo editorial de publicaciones', () => {
  test('Marketing redacta y envía a revisión; el Párroco aprueba y se publica en /noticias', async ({
    browser,
    page,
  }) => {
    const titulo = tituloUnico('Noticia E2E aprobada');
    const resumen = 'Resumen breve de prueba para verificar el flujo editorial completo.';
    const cuerpo = 'Texto redactado en BlockNote para la noticia publicada en el portal.';

    const marketing = await abrirContextoConRol(browser, 'marketing');
    try {
      await redactarYEnviarARevision(marketing.page, { titulo, resumen, cuerpo });

      await marketing.page.goto('/admin/publicaciones');
      const fila = marketing.page.getByRole('row', { name: new RegExp(titulo) });
      await expect(fila).toBeVisible();
      await expect(fila).toContainText('En revisión');
    } finally {
      await marketing.context.close();
    }

    const parroco = await abrirContextoConRol(browser, 'parroco');
    try {
      await parroco.page.goto('/admin/publicaciones/revision');
      const tarjeta = parroco.page.getByRole('article', { name: titulo });
      await expect(tarjeta).toBeVisible();

      await tarjeta.getByRole('button', { name: `Aprobar «${titulo}»` }).click();
      const dialogoAprobar = parroco.page.getByRole('dialog', { name: 'Aprobar publicación' });
      await expect(dialogoAprobar).toBeVisible();
      await dialogoAprobar.getByRole('button', { name: 'Aprobar y publicar' }).click();
      await expect(dialogoAprobar).toBeHidden();
      await expect(tarjeta).toBeHidden();
    } finally {
      await parroco.context.close();
    }

    await page.goto('/noticias');
    const enlaceNoticia = page.getByRole('link', { name: new RegExp(titulo) }).first();
    await expect(enlaceNoticia).toBeVisible();
    await enlaceNoticia.click();

    await expect(page).toHaveURL(/\/noticias\/.+/);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText(cuerpo)).toBeVisible();
  });

  test('el Párroco rechaza con observación y Marketing ve el motivo en su borrador', async ({
    browser,
  }) => {
    const titulo = tituloUnico('Noticia E2E rechazada');
    const resumen = 'Resumen de prueba para el flujo de rechazo con observación.';
    const cuerpo = 'Contenido inicial sujeto a correcciones editoriales.';
    const observacion = 'Falta precisar la fecha y el horario de la celebración parroquial.';

    const marketing = await abrirContextoConRol(browser, 'marketing');
    try {
      await redactarYEnviarARevision(marketing.page, { titulo, resumen, cuerpo });

      const parroco = await abrirContextoConRol(browser, 'parroco');
      try {
        await parroco.page.goto('/admin/publicaciones/revision');
        const tarjeta = parroco.page.getByRole('article', { name: titulo });
        await expect(tarjeta).toBeVisible();

        await tarjeta.getByRole('button', { name: `Rechazar «${titulo}»` }).click();
        const dialogoRechazar = parroco.page.getByRole('dialog', { name: 'Rechazar publicación' });
        await expect(dialogoRechazar).toBeVisible();
        await dialogoRechazar.getByLabel('Observación').fill(observacion);
        await dialogoRechazar.getByRole('button', { name: 'Rechazar publicación' }).click();
        await expect(dialogoRechazar).toBeHidden();
        await expect(tarjeta).toBeHidden();
      } finally {
        await parroco.context.close();
      }

      await marketing.page.goto('/admin/publicaciones');
      const fila = marketing.page.getByRole('row', { name: new RegExp(titulo) });
      await expect(fila).toBeVisible();
      await fila.getByRole('link', { name: `Editar «${titulo}»` }).click();

      await expect(marketing.page).toHaveURL(/\/admin\/publicaciones\/\d+\/editar/);
      await expect(marketing.page.getByText(observacion)).toBeVisible();
    } finally {
      await marketing.context.close();
    }
  });
});
