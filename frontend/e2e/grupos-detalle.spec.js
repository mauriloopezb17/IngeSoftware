import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Página de cada grupo pastoral', () => {
  test('Marketing agrega fotos y el WhatsApp del responsable a un grupo → el visitante abre el grupo desde /comunidad, ve la galería y el enlace de WhatsApp es correcto', async ({
    browser,
    page,
  }) => {
    const nombreGrupo = tituloUnico('Grupo E2E');

    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    try {
      await secretaria.page.goto('/admin/grupos');
      await secretaria.page.getByRole('button', { name: 'Nuevo grupo' }).click();
      const dialogo = secretaria.page.getByRole('dialog', { name: 'Nuevo grupo pastoral' });
      await expect(dialogo).toBeVisible();
      await dialogo.getByLabel('Nombre').fill(nombreGrupo);
      await dialogo.getByRole('button', { name: 'Crear grupo' }).click();
      await expect(dialogo).toBeHidden();
      await expect(secretaria.page.getByText(`Se creó el grupo «${nombreGrupo}».`)).toBeVisible();
    } finally {
      await secretaria.context.close();
    }

    const marketing = await abrirContextoConRol(browser, 'marketing');
    try {
      await marketing.page.goto('/admin/grupos');
      const buscador = marketing.page.getByPlaceholder('Nombre o descripción');
      await buscador.fill(nombreGrupo);

      const botonEditar = marketing.page.getByRole('button', {
        name: `Editar página de «${nombreGrupo}»`,
      });
      await expect(botonEditar).toBeVisible();
      await botonEditar.click();

      const dialogo = marketing.page.getByRole('dialog', { name: 'Editar grupo pastoral' });
      await expect(dialogo).toBeVisible();
      await dialogo.getByLabel('Responsable (opcional)').fill('Responsable E2E');
      await dialogo.getByLabel('WhatsApp (opcional)').fill('71234567');

      await dialogo.getByRole('button', { name: 'Agregar a la galería' }).click();
      const dialogoGaleria = marketing.page.getByRole('dialog', {
        name: 'Agregar foto o video a la galería',
      });
      await expect(dialogoGaleria).toBeVisible();
      const lista = dialogoGaleria.getByRole('list', { name: 'Archivos disponibles' });
      await lista.getByRole('button').first().click();
      await dialogoGaleria.getByRole('button', { name: 'Agregar a la galería' }).click();
      await expect(dialogoGaleria).toBeHidden();

      await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(dialogo).toBeHidden();
      await expect(marketing.page.getByText(`Se actualizó el grupo «${nombreGrupo}».`)).toBeVisible();
    } finally {
      await marketing.context.close();
    }

    await page.goto('/comunidad');
    const enlaceGrupo = page.getByRole('link', { name: nombreGrupo });
    await expect(enlaceGrupo).toBeVisible();
    await enlaceGrupo.click();

    await expect(page).toHaveURL(/\/comunidad\/grupos\/.+/);
    await expect(page.getByRole('heading', { level: 1, name: nombreGrupo })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fotos y videos' })).toBeVisible();

    const btnWhatsapp = page.getByRole('link', { name: 'Escribir por WhatsApp' });
    await expect(btnWhatsapp).toBeVisible();
    await expect(btnWhatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/59171234567\?text=/);
  });
});
