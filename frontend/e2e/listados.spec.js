import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Listados: filtrar, paginar y exportar CSV por rol (PAR-161.4)', () => {
  test.beforeEach(() => {
    test.setTimeout(180_000);
  });
  test('Secretaría filtra eventos por categoría, pasa a página 2 y exporta el CSV filtrado', async ({
    browser,
  }) => {
    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    const prefijo = tituloUnico('E2E161');
    const otraCategoriaTitulo = `${prefijo}_OTRA_CAT`;
    const creadosIds = [];

    try {
      // Crear 16 eventos próximos en categoría 1 para garantizar al menos 2 páginas (porPagina=15)
      const creaciones = Array.from({ length: 16 }, (_, idx) => {
        const i = idx + 1;
        const dia = String(10 + (i % 15)).padStart(2, '0');
        return secretaria.page.request.post('/api/admin/eventos', {
          data: {
            titulo: `${prefijo}_CAT1_${String(i).padStart(2, '0')}`,
            categoriaEventoId: 1,
            estado: 'PUBLICADO',
            fechaInicio: `2032-08-${dia}T10:00:00-04:00`,
            fechaFin: `2032-08-${dia}T12:00:00-04:00`,
          },
        });
      });
      const respuestasCrear = await Promise.all(creaciones);
      for (const res of respuestasCrear) {
        expect(res.status()).toBe(201);
        const body = await res.json();
        creadosIds.push(body.datos.id);
      }

      // Crear 1 evento en categoría 2 que NO debe aparecer al exportar filtrando por categoría 1
      const resOtra = await secretaria.page.request.post('/api/admin/eventos', {
        data: {
          titulo: otraCategoriaTitulo,
          categoriaEventoId: 2,
          estado: 'PUBLICADO',
          fechaInicio: '2032-08-15T14:00:00-04:00',
          fechaFin: '2032-08-15T16:00:00-04:00',
        },
      });
      expect(resOtra.status()).toBe(201);
      const bodyOtra = await resOtra.json();
      creadosIds.push(bodyOtra.datos.id);

      await secretaria.page.goto('/admin/eventos');
      await expect(secretaria.page.getByRole('heading', { level: 1, name: 'Eventos' })).toBeVisible();

      await Promise.all([
        secretaria.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos?') &&
            res.url().includes('categoria=1') &&
            res.status() === 200,
        ),
        secretaria.page.getByLabel('Categoría').selectOption('1'),
      ]);

      await Promise.all([
        secretaria.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos?') &&
            res.url().includes('pagina=2') &&
            res.status() === 200,
        ),
        secretaria.page.getByRole('button', { name: 'Siguiente' }).click(),
      ]);

      await expect(secretaria.page).toHaveURL(/pagina=2/);

      const [resExport, descarga] = await Promise.all([
        secretaria.page.waitForResponse(
          (res) =>
            res.url().includes('/api/admin/eventos/exportar') && res.request().method() === 'GET',
        ),
        secretaria.page.waitForEvent('download'),
        secretaria.page.getByRole('button', { name: 'Exportar CSV' }).click(),
      ]);

      expect(resExport.status()).toBe(200);
      const urlExport = new URL(resExport.url());
      expect(urlExport.searchParams.has('vista')).toBe(false);
      expect(urlExport.searchParams.get('categoria')).toBe('1');

      const rutaArchivo = await descarga.path();
      const contenidoCsv = await readFile(rutaArchivo, 'utf-8');
      expect(contenidoCsv.startsWith('\uFEFF')).toBe(true);
      const lineas = contenidoCsv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
      expect(lineas[0]).toContain(';');
      expect(lineas[0]).toContain('Título');
      expect(contenidoCsv).toContain(`${prefijo}_CAT1_01`);
      expect(contenidoCsv).not.toContain(otraCategoriaTitulo);
    } finally {
      await Promise.all(
        creadosIds.map((id) =>
          secretaria.page.request.delete(`/api/admin/eventos/${id}`).catch(() => {}),
        ),
      );
      await secretaria.context.close();
    }
  });

  test('Marketing no ve Exportar CSV en proclamas y la API responde 403', async ({ browser }) => {
    const marketing = await abrirContextoConRol(browser, 'marketing');

    try {
      await marketing.page.goto('/admin/proclamas');
      await expect(
        marketing.page.getByRole('heading', { level: 1, name: 'Proclamas' }),
      ).toBeVisible();
      await expect(marketing.page.getByRole('button', { name: 'Exportar CSV' })).toHaveCount(0);

      const resApi = await marketing.page.request.get('/api/admin/proclamas/exportar');
      expect(resApi.status()).toBe(403);
    } finally {
      await marketing.context.close();
    }
  });
});
