import { expect, test } from '@playwright/test';
import { abrirContextoConRol } from './helpers/sesion.js';

test.describe('Exportación CSV y búsqueda en Eventos y Proclamas contra backend real', () => {
  test('Administrador busca y exporta CSV en /admin/eventos y /admin/proclamas sin enviar vista', async ({
    browser,
  }) => {
    const admin = await abrirContextoConRol(browser, 'admin');

    try {
      // 1. /admin/eventos en vista predeterminada ("proximos")
      await admin.page.goto('/admin/eventos');
      await expect(admin.page.getByRole('heading', { level: 1, name: 'Eventos' })).toBeVisible();

      const primeraFilaEvento = admin.page.locator('tbody tr').first();
      await expect(primeraFilaEvento).toBeVisible();
      const totalAntes = await admin.page.locator('tbody tr').count();
      const textoPrimerEvento = (await primeraFilaEvento.innerText()).trim();
      const terminoEvento = textoPrimerEvento.split(/\s+/).find((p) => p.length >= 4) ?? 'Misa';

      const [respuestaBusquedaEvento] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos?') &&
            res.url().includes('buscar=') &&
            res.request().method() === 'GET',
        ),
        admin.page.getByRole('searchbox').fill(terminoEvento),
      ]);
      expect(respuestaBusquedaEvento.status()).toBe(200);
      await expect(admin.page.locator('tbody tr').first()).toContainText(
        new RegExp(terminoEvento, 'i'),
      );
      expect(await admin.page.locator('tbody tr').count()).toBeLessThanOrEqual(totalAntes);

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
      expect(urlExportEvento.searchParams.get('buscar')).toBe(terminoEvento);
      expect(descargaEvento.suggestedFilename()).toMatch(/^eventos-\d{4}-\d{2}-\d{2}\.csv$/);

      // 2. /admin/proclamas en vista predeterminada ("vigentes")
      await admin.page.goto('/admin/proclamas');
      await expect(admin.page.getByRole('heading', { level: 1, name: 'Proclamas' })).toBeVisible();
      await admin.page.waitForLoadState('networkidle');

      const terminoProclama = 'Carlos';
      const [respuestaBusquedaProclama] = await Promise.all([
        admin.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/proclamas?') &&
            res.url().includes('buscar=') &&
            res.request().method() === 'GET',
        ),
        admin.page.getByRole('searchbox').fill(terminoProclama),
      ]);
      expect(respuestaBusquedaProclama.status()).toBe(200);

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
      expect(urlExportProclama.searchParams.get('buscar')).toBe(terminoProclama);
      expect(descargaProclama.suggestedFilename()).toMatch(/^proclamas-\d{4}-\d{2}-\d{2}\.csv$/);
    } finally {
      await admin.context.close();
    }
  });
});
