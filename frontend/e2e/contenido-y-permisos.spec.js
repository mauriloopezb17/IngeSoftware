import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Gestión de contenido y permisos por rol', () => {
  test('Secretaría crea, edita y elimina un grupo pastoral y se refleja en el portal', async ({
    browser,
    page,
  }) => {
    const nombre = tituloUnico('Grupo E2E');
    const nombreEditado = tituloUnico('Grupo E2E editado');

    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    try {
      await secretaria.page.goto('/admin/grupos');
      await expect(
        secretaria.page.getByRole('heading', { level: 1, name: 'Grupos pastorales' }),
      ).toBeVisible();

      await secretaria.page.getByRole('button', { name: 'Nuevo grupo' }).click();
      const dialogoCrear = secretaria.page.getByRole('dialog', { name: 'Nuevo grupo' });
      await expect(dialogoCrear).toBeVisible();
      await dialogoCrear.getByLabel('Nombre').fill(nombre);
      await dialogoCrear.getByLabel('Horario de reunión (opcional)').fill('Sábados · 16:00');
      await dialogoCrear.getByRole('button', { name: 'Crear grupo' }).click();
      await expect(dialogoCrear).toBeHidden();

      await expect(secretaria.page.getByRole('heading', { level: 2, name: nombre })).toBeVisible();

      await page.goto('/');
      const seccionComunidad = page.locator('#comunidad');
      await expect(seccionComunidad).toContainText(nombre);

      await secretaria.page.getByRole('button', { name: `Editar ${nombre}` }).click();
      const dialogoEditar = secretaria.page.getByRole('dialog', { name: 'Editar grupo' });
      await expect(dialogoEditar).toBeVisible();
      await dialogoEditar.getByLabel('Nombre').fill(nombreEditado);
      await dialogoEditar.getByRole('button', { name: 'Guardar cambios' }).click();
      await expect(dialogoEditar).toBeHidden();

      await expect(
        secretaria.page.getByRole('heading', { level: 2, name: nombreEditado }),
      ).toBeVisible();

      await page.reload();
      await expect(seccionComunidad).toContainText(nombreEditado);
      await expect(seccionComunidad).not.toContainText(nombre);

      await secretaria.page.getByRole('button', { name: `Eliminar ${nombreEditado}` }).click();
      const dialogoBorrar = secretaria.page.getByRole('dialog');
      await expect(dialogoBorrar).toBeVisible();
      await dialogoBorrar.getByRole('button', { name: 'Eliminar' }).click();
      await expect(dialogoBorrar).toBeHidden();
      await expect(
        secretaria.page.getByRole('heading', { level: 2, name: nombreEditado }),
      ).toBeHidden();

      await page.reload();
      await expect(seccionComunidad).not.toContainText(nombreEditado);
    } finally {
      await secretaria.context.close();
    }
  });

  const casosPermisos = [
    { rol: 'admin', usuarios: 'Usuarios', bitacora: 'Bitácora' },
    { rol: 'parroco', usuarios: 'Sin permiso', bitacora: 'Bitácora' },
    { rol: 'secretaria', usuarios: 'Sin permiso', bitacora: 'Sin permiso' },
    { rol: 'marketing', usuarios: 'Sin permiso', bitacora: 'Sin permiso' },
  ];

  for (const caso of casosPermisos) {
    test(`permisos de ${caso.rol} en Usuarios y Bitácora`, async ({ browser }) => {
      const sesion = await abrirContextoConRol(browser, caso.rol);
      try {
        await sesion.page.goto('/admin/usuarios');
        await expect(
          sesion.page.getByRole('heading', { level: 1, name: caso.usuarios }),
        ).toBeVisible();

        await sesion.page.goto('/admin/bitacora');
        await expect(
          sesion.page.getByRole('heading', { level: 1, name: caso.bitacora }),
        ).toBeVisible();
      } finally {
        await sesion.context.close();
      }
    });
  }
});
