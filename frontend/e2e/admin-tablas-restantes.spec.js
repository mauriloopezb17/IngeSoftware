import { expect, test } from '@playwright/test';
import { abrirContextoConRol } from './helpers/sesion.js';

const PANTALLAS_ADMIN = [
  { ruta: '/admin/horarios', titulo: 'Horarios' },
  { ruta: '/admin/servicios', titulo: 'Servicios y sacramentos' },
  { ruta: '/admin/grupos', titulo: 'Grupos pastorales' },
  { ruta: '/admin/videos', titulo: 'Videos' },
  { ruta: '/admin/paginas', titulo: 'Páginas' },
  { ruta: '/admin/sedes', titulo: 'Sedes' },
  { ruta: '/admin/eventos', titulo: 'Eventos' },
  { ruta: '/admin/boletines', titulo: 'Boletines' },
];

test.describe('Tablas de listados restantes y filtros contra el backend real', () => {
  test.beforeEach(() => {
    test.setTimeout(180_000);
  });
  test('carga todas las pantallas paginadas y aplica filtros sin respuestas HTTP 400+', async ({
    browser,
  }) => {
    const admin = await abrirContextoConRol(browser, 'admin');
    const respuestasError = [];
    admin.page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        respuestasError.push(`${res.status()} ${res.url()}`);
      }
    });

    try {
      for (const pantalla of PANTALLAS_ADMIN) {
        await admin.page.goto(pantalla.ruta);
        await expect(
          admin.page.getByRole('heading', { level: 1, name: pantalla.titulo }),
        ).toBeVisible();
        await admin.page.waitForLoadState('networkidle');
      }

      // Verificar búsqueda y filtros en /admin/horarios contra el backend real
      await admin.page.goto('/admin/horarios');
      await expect(admin.page.getByRole('table')).toBeVisible();
      await admin.page.getByLabel('Estado').selectOption('true');
      await admin.page.getByPlaceholder('Nota del horario').fill('misa');
      await admin.page.waitForLoadState('networkidle');

      // Verificar filtro de visibilidad y aviso de reordenamiento en /admin/servicios
      await admin.page.goto('/admin/servicios');
      await expect(admin.page.getByRole('table')).toBeVisible();
      await admin.page.getByLabel('Visibilidad').selectOption('true');
      await expect(
        admin.page.getByText(/Para reordenar los servicios, quita los filtros/),
      ).toBeVisible();
      await admin.page.waitForLoadState('networkidle');

      expect(respuestasError).toEqual([]);
    } finally {
      await admin.context.close();
    }

    const parroco = await abrirContextoConRol(browser, 'parroco');
    const erroresParroco = [];
    parroco.page.on('response', (res) => {
      if (res.url().includes('/api/') && res.status() >= 400) {
        erroresParroco.push(`${res.status()} ${res.url()}`);
      }
    });
    try {
      await parroco.page.goto('/admin/proclamas/observaciones');
      await expect(parroco.page.getByRole('heading', { level: 1, name: 'Proclamas' })).toBeVisible();
      await parroco.page.waitForLoadState('networkidle');
      expect(erroresParroco).toEqual([]);
    } finally {
      await parroco.context.close();
    }
  });
});
