import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

function diaMananaBolivia() {
  const mananaMs = Date.now() + 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000;
  return new Date(mananaMs).toISOString().slice(0, 10);
}

test.describe('Detalle de eventos del calendario', () => {
  test('Secretaría crea evento, Marketing edita su página y el visitante abre calendario -> día -> detalle', async ({
    browser,
    page,
  }) => {
    const titulo = tituloUnico('Jornada E2E detalle');
    const dia = diaMananaBolivia();
    const direccion = 'Av. Ormachea 167, Salón Benedicto';
    const cuerpo = 'Encuentro abierto con adoración, formación y compartir comunitario.';
    const enlaceMapa = 'https://maps.app.goo.gl/ejemploE2E';
    const responsableNombre = 'Pastoral Juvenil E2E';

    // 1. Secretaría crea el evento publicado en el panel.
    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    try {
      await secretaria.page.goto('/admin/eventos/nuevo');
      await secretaria.page.getByLabel('Título').fill(titulo);
      await secretaria.page.getByLabel('Categoría').selectOption({ label: 'Comunidad' });
      const inicio = secretaria.page.getByRole('group', { name: 'Inicio' });
      await inicio.getByLabel('Día').fill(dia);
      await inicio.getByLabel('Hora').fill('18:00');
      await secretaria.page.getByLabel('Lugar (opcional)').fill('Templo parroquial');
      await secretaria.page.getByRole('button', { name: 'Crear evento' }).click();

      await expect(secretaria.page).toHaveURL(/\/admin\/eventos$/);
      await expect(secretaria.page.getByRole('row', { name: new RegExp(titulo) })).toBeVisible();
    } finally {
      await secretaria.context.close();
    }

    // 2. Marketing entra a editar solo la página del evento (tarjeta bloqueada).
    const marketing = await abrirContextoConRol(browser, 'marketing');
    try {
      await marketing.page.goto('/admin/eventos');
      await marketing.page.getByRole('link', { name: `Editar página de «${titulo}»` }).click();
      await expect(marketing.page).toHaveURL(/\/admin\/eventos\/\d+\/editar/);
      await expect(marketing.page.getByText('Solo lectura · gestionado por secretaría')).toBeVisible();
      await expect(marketing.page.getByLabel('Título')).toBeDisabled();

      const editor = marketing.page.locator('[contenteditable="true"]').first();
      await expect(editor).toBeVisible();
      await editor.click();
      await marketing.page.keyboard.type(cuerpo);

      await marketing.page.getByLabel('Dirección').fill(direccion);
      await marketing.page.getByLabel('Enlace de Google Maps').fill(enlaceMapa);
      await marketing.page.getByRole('button', { name: 'Agregar actividad' }).click();
      await marketing.page.getByLabel('Hora 1', { exact: true }).fill('18:30');
      await marketing.page.getByLabel('Actividad 1', { exact: true }).fill('Bienvenida e inicio del encuentro');
      await marketing.page.getByLabel('Nombre del responsable').fill(responsableNombre);

      await marketing.page.getByRole('button', { name: 'Guardar página del evento' }).click();
      await expect(marketing.page).toHaveURL(/\/admin\/eventos$/);
    } finally {
      await marketing.context.close();
    }

    // 3. Visitante abre /calendario -> entra al día /calendario/dia/:fecha -> abre /calendario/:id.
    await page.goto('/calendario');
    const seccionDia = page.locator(`section[aria-labelledby="dia-calendario-${dia}"]`);
    await expect(seccionDia).toBeVisible();
    await seccionDia.getByRole('link', { name: /Ver día/ }).click();

    await expect(page).toHaveURL(new RegExp(`/calendario/dia/${dia}$`));
    const tarjetaDia = page.getByRole('link', { name: titulo });
    await expect(tarjetaDia).toBeVisible();
    await tarjetaDia.click();

    await expect(page).toHaveURL(/\/calendario\/\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByText(cuerpo)).toBeVisible();
    await expect(page.getByText(direccion)).toBeVisible();
    await expect(page.getByRole('link', { name: /Cómo llegar en Google Maps/ })).toHaveAttribute('href', enlaceMapa);
    await expect(page.getByText('Bienvenida e inicio del encuentro')).toBeVisible();
    await expect(page.getByText(responsableNombre)).toBeVisible();
  });
});
