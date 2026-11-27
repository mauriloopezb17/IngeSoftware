import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Exportación CSV y búsqueda en Eventos y Proclamas contra backend real', () => {
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });
  test('Administrador busca y exporta CSV en /admin/eventos y /admin/proclamas sin enviar vista', async ({
    browser,
  }) => {
    const admin = await abrirContextoConRol(browser, 'admin');
    const tituloEvento = tituloUnico('Evento CSV');
    const novioProclama = tituloUnico('Novio CSV');
    let eventoId;
    let proclamaId;

    try {
      const resEvento = await admin.page.request.post('/api/admin/eventos', {
        data: {
          titulo: tituloEvento,
          categoriaEventoId: 1,
          estado: 'PUBLICADO',
          fechaInicio: '2032-09-10T10:00:00-04:00',
          fechaFin: '2032-09-10T12:00:00-04:00',
        },
      });
      expect(resEvento.status()).toBe(201);
      eventoId = (await resEvento.json()).datos.id;

      const resProclama = await admin.page.request.post('/api/admin/proclamas', {
        data: {
          contrayente1: novioProclama,
          contrayente2: 'Elena CSV',
          fechaMatrimonio: '2032-11-15T11:00:00-04:00',
          publicaciones: [{ fecha: '2020-10-25' }],
        },
      });
      expect(resProclama.status()).toBe(201);
      proclamaId = (await resProclama.json()).datos.id;

      // 1. /admin/eventos en vista predeterminada ("proximos")
      await admin.page.goto('/admin/eventos');
      await expect(admin.page.getByRole('heading', { level: 1, name: 'Eventos' })).toBeVisible();

      const [respuestaBusquedaEvento] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos?') &&
            res.url().includes('buscar=') &&
            res.request().method() === 'GET',
        ),
        admin.page.getByRole('searchbox').fill(tituloEvento),
      ]);
      expect(respuestaBusquedaEvento.status()).toBe(200);
      await expect(admin.page.getByRole('row', { name: new RegExp(tituloEvento) })).toBeVisible();

      const [respuestaExportEvento, descargaEvento] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos/exportar') && res.request().method() === 'GET',
        ),
        admin.page.waitForEvent('download'),
        admin.page.getByRole('button', { name: 'Exportar CSV' }).click(),
      ]);

      expect(respuestaExportEvento.status()).toBe(200);
      const urlExportEvento = new URL(respuestaExportEvento.url());
      expect(urlExportEvento.searchParams.has('vista')).toBe(false);
      expect(urlExportEvento.searchParams.get('finalizados')).toBe('false');
      expect(urlExportEvento.searchParams.get('orden')).toBe('fechaInicio');
      expect(urlExportEvento.searchParams.get('buscar')).toBe(tituloEvento);
      expect(descargaEvento.suggestedFilename()).toMatch(/^eventos-\d{4}-\d{2}-\d{2}\.csv$/);

      // 2. /admin/proclamas en vista predeterminada ("vigentes")
      await admin.page.goto('/admin/proclamas');
      await expect(admin.page.getByRole('heading', { level: 1, name: 'Proclamas' })).toBeVisible();

      const [respuestaBusquedaProclama] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/proclamas?') &&
            res.url().includes('buscar=') &&
            res.request().method() === 'GET',
        ),
        admin.page.getByRole('searchbox').fill(novioProclama),
      ]);
      expect(respuestaBusquedaProclama.status()).toBe(200);
      await expect(admin.page.getByRole('row', { name: new RegExp(novioProclama) })).toBeVisible();

      const [respuestaExportProclama, descargaProclama] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/proclamas/exportar') && res.request().method() === 'GET',
        ),
        admin.page.waitForEvent('download'),
        admin.page.getByRole('button', { name: 'Exportar CSV' }).click(),
      ]);

      expect(respuestaExportProclama.status()).toBe(200);
      const urlExportProclama = new URL(respuestaExportProclama.url());
      expect(urlExportProclama.searchParams.has('vista')).toBe(false);
      expect(urlExportProclama.searchParams.get('vigentes')).toBe('true');
      expect(urlExportProclama.searchParams.get('orden')).toBe('fechaMatrimonio');
      expect(urlExportProclama.searchParams.get('buscar')).toBe(novioProclama);
      expect(descargaProclama.suggestedFilename()).toMatch(/^proclamas-\d{4}-\d{2}-\d{2}\.csv$/);
    } finally {
      if (eventoId) {
        await admin.page.request.delete(`/api/admin/eventos/${eventoId}`).catch(() => {});
      }
      if (proclamaId) {
        await admin.page.request.delete(`/api/admin/proclamas/${proclamaId}`).catch(() => {});
      }
      await admin.context.close();
    }
  });
});
