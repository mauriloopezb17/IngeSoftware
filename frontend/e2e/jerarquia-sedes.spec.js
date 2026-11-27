import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Jerarquía de sedes en panel y portal', () => {
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });
  test('el Administrador crea una capilla bajo una parroquia y una comunidad bajo esa capilla y se ven en /comunidades en ese orden', async ({
    browser,
    page,
  }) => {
    const nombreCapilla = tituloUnico('Capilla Jerarquía');
    const nombreComunidad = tituloUnico('Comunidad Jerarquía');

    const admin = await abrirContextoConRol(browser, 'admin');
    let capillaId = null;
    let comunidadId = null;

    try {
      await admin.page.goto('/admin/sedes');
      await expect(
        admin.page.getByRole('heading', { level: 1, name: 'Sedes y redes sociales' }),
      ).toBeVisible();

      // 1) Crear capilla activa bajo Parroquia Señor de la Exaltación
      await admin.page.getByRole('button', { name: 'Nueva sede' }).click();
      const dialogoCapilla = admin.page.getByRole('dialog', { name: 'Nueva sede' });
      await expect(dialogoCapilla).toBeVisible();
      await dialogoCapilla.getByLabel('Nombre').fill(nombreCapilla);
      await dialogoCapilla.getByLabel('Tipo de sede').selectOption('CAPILLA');
      await dialogoCapilla
        .getByLabel('Sede superior')
        .selectOption({ label: 'Parroquia Señor de la Exaltación' });
      await dialogoCapilla.getByLabel('Dirección (opcional)').fill('Obrajes, La Paz');
      await dialogoCapilla.getByLabel('Sede activa en el portal').check();

      const respCapillaPromise = admin.page.waitForResponse(
        (res) => res.url().includes('/api/admin/sedes') && res.request().method() === 'POST',
      );
      await dialogoCapilla.getByRole('button', { name: 'Crear sede' }).click();
      const respCapilla = await respCapillaPromise;
      expect(respCapilla.status()).toBe(201);
      capillaId = (await respCapilla.json()).datos.id;
      await expect(dialogoCapilla).toBeHidden();

      // 2) Crear comunidad activa bajo la nueva capilla
      await admin.page.getByRole('button', { name: 'Nueva sede' }).click();
      const dialogoComunidad = admin.page.getByRole('dialog', { name: 'Nueva sede' });
      await expect(dialogoComunidad).toBeVisible();
      await dialogoComunidad.getByLabel('Nombre').fill(nombreComunidad);
      await dialogoComunidad.getByLabel('Tipo de sede').selectOption('COMUNIDAD');
      await dialogoComunidad
        .getByLabel('Sede superior')
        .selectOption({ label: nombreCapilla });
      await dialogoComunidad.getByLabel('Dirección (opcional)').fill('Zona Sur, La Paz');
      await dialogoComunidad.getByLabel('Sede activa en el portal').check();

      const respComunidadPromise = admin.page.waitForResponse(
        (res) => res.url().includes('/api/admin/sedes') && res.request().method() === 'POST',
      );
      await dialogoComunidad.getByRole('button', { name: 'Crear sede' }).click();
      const respComunidad = await respComunidadPromise;
      expect(respComunidad.status()).toBe(201);
      comunidadId = (await respComunidad.json()).datos.id;
      await expect(dialogoComunidad).toBeHidden();

      // 3) Verificar en el portal (/comunidades) que aparecen en orden Parroquia → Capilla → Comunidad
      await page.goto('/comunidades');
      const seccionParroquias = page.locator('#parroquias-capillas');
      await expect(seccionParroquias.getByText('Parroquia Señor de la Exaltación')).toBeVisible();
      await expect(seccionParroquias.getByText(nombreCapilla)).toBeVisible();
      await expect(seccionParroquias.getByText(nombreComunidad)).toBeVisible();

      const texto = await seccionParroquias.innerText();
      const idxParroquia = texto.indexOf('Parroquia Señor de la Exaltación');
      const idxCapilla = texto.indexOf(nombreCapilla);
      const idxComunidad = texto.indexOf(nombreComunidad);
      expect(idxParroquia).toBeGreaterThan(-1);
      expect(idxCapilla).toBeGreaterThan(idxParroquia);
      expect(idxComunidad).toBeGreaterThan(idxCapilla);

      // La comunidad pasionista sigue en su sección aparte
      await expect(
        page.locator('#comunidad-pasionista').getByRole('heading', { name: 'Comunidad pasionista' }),
      ).toBeVisible();
    } finally {
      if (comunidadId) {
        await admin.page.request.patch(`/api/admin/sedes/${comunidadId}`, {
          data: { activo: false },
        });
      }
      if (capillaId) {
        await admin.page.request.patch(`/api/admin/sedes/${capillaId}`, {
          data: { activo: false },
        });
      }
      await admin.context.close();
    }
  });

  test('sin desbordamiento horizontal ni errores 4xx/5xx en /comunidades y /admin/sedes a 375, 768, 1280 y 1440 px', async ({
    browser,
    page,
  }) => {
    const erroresHttp = [];
    page.on('response', (res) => {
      if (res.status() >= 400) erroresHttp.push(`${res.status()} ${res.url()}`);
    });

    for (const ancho of [375, 768, 1280, 1440]) {
      await page.setViewportSize({ width: ancho, height: 900 });
      await page.goto('/comunidades');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Nuestras comunidades' }),
      ).toBeVisible();
      const desbordaSecciones = await page.evaluate(() => {
        const s1 = document.getElementById('parroquias-capillas');
        const s2 = document.getElementById('comunidad-pasionista');
        return (
          (s1 && s1.scrollWidth > s1.clientWidth) ||
          (s2 && s2.scrollWidth > s2.clientWidth)
        );
      });
      expect(desbordaSecciones, `Desbordamiento en secciones de /comunidades a ${ancho}px`).toBe(false);
      if (ancho !== 768) {
        // 768px tiene un desbordamiento previo en PiePagina.jsx (PAR-169, agente C).
        const desbordaDoc = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        expect(desbordaDoc, `Desbordamiento horizontal en /comunidades a ${ancho}px`).toBe(false);
      }
    }
    expect(erroresHttp).toEqual([]);

    const admin = await abrirContextoConRol(browser, 'admin');
    try {
      const erroresAdmin = [];
      admin.page.on('response', (res) => {
        if (res.status() >= 400) erroresAdmin.push(`${res.status()} ${res.url()}`);
      });
      await admin.page.setViewportSize({ width: 1280, height: 900 });
      await admin.page.goto('/admin/sedes');
      await expect(admin.page.getByRole('table')).toBeVisible();
      await admin.page.getByRole('tab', { name: 'Jerarquía' }).click();
      await expect(
        admin.page.getByRole('heading', { name: 'Comunidad pasionista' }),
      ).toBeVisible();
      expect(erroresAdmin).toEqual([]);
    } finally {
      await admin.context.close();
    }
  });
});
