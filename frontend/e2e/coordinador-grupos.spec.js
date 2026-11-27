import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Coordinador de grupo', () => {
  test('el Administrador crea un coordinador con un grupo → el coordinador inicia sesión, solo ve Mis grupos, edita la foto y el WhatsApp de su grupo → se ve en el portal; no puede abrir /admin/eventos', async ({
    browser,
    page,
  }) => {
    const nombreGrupo = tituloUnico('Grupo Coord E2E');
    const correoCoord = `${tituloUnico('coord-e2e').replace(/\s+/g, '-').toLowerCase()}@parroquia.test`;
    const claveCoord = 'Clave-Coord-2026!';
    let grupoId;

    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    try {
      await secretaria.page.goto('/admin/grupos');
      await secretaria.page.getByRole('button', { name: 'Nuevo grupo' }).click();
      const dialogoGrupo = secretaria.page.getByRole('dialog', { name: 'Nuevo grupo pastoral' });
      await dialogoGrupo.getByLabel('Nombre').fill(nombreGrupo);
      const [respGrupo] = await Promise.all([
        secretaria.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/grupos-pastorales') && res.request().method() === 'POST',
        ),
        dialogoGrupo.getByRole('button', { name: 'Crear grupo' }).click(),
      ]);
      grupoId = (await respGrupo.json())?.datos?.id;
      await expect(dialogoGrupo).toBeHidden();
    } finally {
      await secretaria.context.close();
    }

    const admin = await abrirContextoConRol(browser, 'admin');
    try {
      await admin.page.goto('/admin/usuarios');
      await expect(admin.page.getByRole('table', { name: 'Usuarios' })).toBeVisible();
      await admin.page.getByRole('button', { name: /Nuevo usuario/ }).click();
      const dialogoUsuario = admin.page.getByRole('dialog', { name: 'Nuevo usuario' });
      await expect(dialogoUsuario).toBeVisible();
      await dialogoUsuario.getByLabel('Nombre completo').fill('Coordinador E2E');
      await dialogoUsuario.getByLabel('Correo electrónico').fill(correoCoord);
      await dialogoUsuario.getByLabel('Rol').selectOption('COORDINADOR');
      await dialogoUsuario.getByLabel('Sede').selectOption({ label: 'Parroquia Señor de la Exaltación' });
      const casillaGrupo = dialogoUsuario.getByLabel(nombreGrupo);
      await expect(casillaGrupo).toBeVisible();
      await casillaGrupo.check();
      await dialogoUsuario.getByLabel('Contraseña inicial').fill(claveCoord);
      const [respCrearUsuario] = await Promise.all([
        admin.page.waitForResponse(
          (res) => res.url().includes('/api/admin/usuarios') && res.request().method() === 'POST',
        ),
        dialogoUsuario.getByRole('button', { name: 'Crear usuario' }).click(),
      ]);
      expect(respCrearUsuario.status()).toBe(201);
      await expect(dialogoUsuario).toBeHidden();
    } finally {
      await admin.context.close();
    }

    try {
      const ctxCoord = await browser.newContext();
      const pageCoord = await ctxCoord.newPage();
      const erroresApi = [];
      pageCoord.on('response', (res) => {
        if (res.url().includes('/api/admin/') && res.status() >= 400) {
          erroresApi.push(`${res.request().method()} ${res.url()} -> ${res.status()}`);
        }
      });
      try {
        await pageCoord.goto('/admin/login');
        await pageCoord.getByLabel('Correo electrónico').fill(correoCoord);
        await pageCoord.getByLabel('Contraseña', { exact: true }).fill(claveCoord);
        await pageCoord.getByRole('button', { name: 'Iniciar sesión' }).click();
        await expect(pageCoord).toHaveURL(/\/admin\/inicio/);

        const menu = pageCoord.getByRole('navigation', { name: 'Menú principal' });
        await expect(menu.getByRole('link', { name: 'Mis grupos' })).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Eventos' })).toHaveCount(0);

        await menu.getByRole('link', { name: 'Mis grupos' }).click();
        await expect(pageCoord.getByRole('heading', { name: 'Mis grupos' })).toBeVisible();

        const btnEditar = pageCoord.getByRole('button', { name: `Editar página de «${nombreGrupo}»` });
        await expect(btnEditar).toBeVisible();
        await btnEditar.click();

        const dialogo = pageCoord.getByRole('dialog', { name: 'Editar grupo pastoral' });
        await dialogo.getByLabel('WhatsApp (opcional)').fill('71234567');
        await dialogo.getByRole('button', { name: 'Elegir imagen' }).click();
        const selector = pageCoord.getByRole('dialog', { name: 'Elegir imagen del grupo' });
        await selector.getByRole('list', { name: 'Imágenes' }).getByRole('button').first().click();
        await selector.getByRole('button', { name: 'Usar esta imagen' }).click();
        await expect(selector).toBeHidden();

        await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
        await expect(dialogo).toBeHidden();
        await expect(pageCoord.getByText(`Se actualizó el grupo «${nombreGrupo}».`)).toBeVisible();
        expect(erroresApi).toEqual([]);

        await pageCoord.goto('/admin/eventos');
        await expect(pageCoord.getByText(/no tiene acceso a esta sección/i)).toBeVisible();
      } finally {
        await ctxCoord.close();
      }

      await page.goto('/comunidad');
      await page.getByRole('link', { name: nombreGrupo }).click();
      await expect(page.getByRole('heading', { level: 1, name: nombreGrupo })).toBeVisible();
      const btnWhatsapp = page.getByRole('link', { name: 'Escribir por WhatsApp' });
      await expect(btnWhatsapp).toBeVisible();
      await expect(btnWhatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/59171234567\?text=/);
    } finally {
      if (grupoId) {
        const limpieza = await abrirContextoConRol(browser, 'admin');
        try {
          await limpieza.page.request.delete(`/api/admin/grupos-pastorales/${grupoId}`);
        } finally {
          await limpieza.context.close();
        }
      }
    }
  });
});
