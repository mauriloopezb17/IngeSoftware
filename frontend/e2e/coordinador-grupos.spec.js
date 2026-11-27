import { expect, test } from '@playwright/test';
import {
  desactivarUsuarioAdmin,
  eliminarGrupoAdmin,
  eliminarPublicacionAdmin,
} from './helpers/limpieza.js';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Coordinador de grupo', () => {
  test.beforeEach(() => {
    test.setTimeout(180_000);
  });
  test('el Administrador crea un coordinador con un grupo → el coordinador inicia sesión, solo ve Mis grupos, edita la foto y el WhatsApp de su grupo, redacta una noticia y el Párroco la aprueba → se ve en el portal; no puede abrir /admin/eventos', async ({
    browser,
    page,
  }) => {
    test.slow();
    const nombreGrupo = tituloUnico('Grupo Coord E2E');
    const tituloNoticia = tituloUnico('Noticia Coord');
    const correoCoord = `${tituloUnico('coord-ee').replace(/\s+/g, '-').toLowerCase()}@parroquia.test`;
    const claveCoord = 'Clave-Coord-2026!';
    let grupoId;
    let noticiaId;
    let usuarioId;

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
      usuarioId = (await respCrearUsuario.json())?.datos?.id;
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
        await expect(menu.getByRole('link', { name: 'Mis grupos', exact: true })).toBeVisible();
        await expect(menu.getByRole('link', { name: 'Eventos' })).toHaveCount(0);

        await menu.getByRole('link', { name: 'Mis grupos', exact: true }).click();
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

        await menu.getByRole('link', { name: 'Noticias de mis grupos' }).click();
        await expect(
          pageCoord.getByRole('heading', { name: 'Noticias de mis grupos' }),
        ).toBeVisible();
        await pageCoord.getByRole('link', { name: 'Nueva noticia' }).click();
        await pageCoord.getByLabel('Título').fill(tituloNoticia);
        const editor = pageCoord
          .getByRole('group', { name: 'Contenido de la publicación' })
          .locator('[contenteditable="true"]')
          .first();
        await expect(editor).toBeVisible();
        await editor.click();
        await pageCoord.keyboard.type('Noticia redactada por el coordinador para su grupo.');
        await expect(
          pageCoord.getByRole('button', { name: `Quitar ${nombreGrupo}` }),
        ).toBeVisible();
        const [respCrearNoticia] = await Promise.all([
          pageCoord.waitForResponse(
            (res) =>
              res.url().includes('/api/admin/publicaciones') && res.request().method() === 'POST',
          ),
          pageCoord.getByRole('button', { name: 'Guardar borrador' }).click(),
        ]);
        noticiaId = (await respCrearNoticia.json())?.datos?.id;
        await expect(pageCoord.getByRole('button', { name: 'Enviar a revisión' })).toBeVisible();
        await pageCoord.getByRole('button', { name: 'Enviar a revisión' }).click();
        const dialogoRevision = pageCoord.getByRole('dialog', { name: 'Enviar a revisión' });
        await dialogoRevision.getByRole('button', { name: 'Enviar a revisión' }).click();
        await expect(pageCoord.getByText('Se envió a revisión del párroco.')).toBeVisible();
        expect(erroresApi).toEqual([]);

        await pageCoord.goto('/admin/eventos');
        await expect(pageCoord.getByText(/no tiene acceso a esta sección/i)).toBeVisible();
      } finally {
        await ctxCoord.close();
      }

      const parroco = await abrirContextoConRol(browser, 'parroco');
      try {
        await parroco.page.goto('/admin/publicaciones/revision');
        const fila = parroco.page.getByRole('row', { name: new RegExp(tituloNoticia) });
        await expect(fila).toBeVisible();
        await fila.getByRole('button', { name: `Aprobar «${tituloNoticia}»` }).click();
        const dialogoAprobar = parroco.page.getByRole('dialog', { name: 'Aprobar publicación' });
        await expect(dialogoAprobar).toBeVisible();
        await dialogoAprobar.getByRole('button', { name: 'Aprobar y publicar' }).click();
        await expect(dialogoAprobar).toBeHidden();
      } finally {
        await parroco.context.close();
      }

      await page.goto('/comunidad');
      await page.getByRole('link', { name: nombreGrupo }).click();
      await expect(page.getByRole('heading', { level: 1, name: nombreGrupo })).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(tituloNoticia) })).toBeVisible();
      const btnWhatsapp = page.getByRole('link', { name: 'Escribir por WhatsApp' });
      await expect(btnWhatsapp).toBeVisible();
      await expect(btnWhatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/59171234567\?text=/);
    } finally {
      await eliminarPublicacionAdmin(browser, noticiaId);
      await eliminarGrupoAdmin(browser, grupoId);
      await desactivarUsuarioAdmin(browser, usuarioId);
    }
  });
});
