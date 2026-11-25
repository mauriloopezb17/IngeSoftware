import { expect, test } from '@playwright/test';
import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

test.describe('Observaciones confidenciales de proclamas', () => {
  test('una persona deja una observación → el Párroco la ve, la marca leída y los enlaces de correo y WhatsApp son correctos; Secretaría no ve la bandeja', async ({
    browser,
    page,
  }) => {
    const novio = tituloUnico('Novio Obs E2E');
    const novia = 'Lucía E2E';
    const remitente = tituloUnico('Testigo E2E');
    const mensaje = tituloUnico('Observación confidencial de prueba para el párroco');

    // Secretaría crea una proclama vigente con publicación alcanzada
    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    let proclamaUrl;
    try {
      await secretaria.page.goto('/admin/proclamas/nueva');
      await secretaria.page.getByLabel('Contrayente 1').fill(novio);
      await secretaria.page.getByLabel('Contrayente 2').fill(novia);
      await secretaria.page.getByLabel('Fecha y hora del matrimonio').fill('2032-12-05T11:00');
      await secretaria.page.getByLabel('Primera proclama (opcional)').fill('2020-10-25');
      await secretaria.page.getByRole('button', { name: 'Crear proclama' }).click();
      await expect(secretaria.page).toHaveURL(/\/admin\/proclamas\/\d+\/editar/);
      proclamaUrl = secretaria.page.url();

      // Secretaría NO ve la pestaña de Observaciones ni puede entrar a la bandeja
      await secretaria.page.goto('/admin/proclamas');
      await expect(secretaria.page.getByRole('link', { name: /Observaciones/ })).toHaveCount(0);
      await secretaria.page.goto('/admin/proclamas/observaciones');
      await expect(secretaria.page.getByRole('heading', { name: 'Sin permiso' })).toBeVisible();
    } finally {
      await secretaria.context.close();
    }

    const idProclama = proclamaUrl.match(/\/admin\/proclamas\/(\d+)\/editar/)[1];

    // Visitante abre la proclama y envía una observación
    await page.goto(`/proclamas/${idProclama}`);
    await expect(
      page.getByRole('heading', { name: '¿Conoces algún impedimento para este matrimonio?' }),
    ).toBeVisible();

    await page.getByLabel('Nombre completo').fill(remitente);
    await page.getByLabel('Correo electrónico').fill('testigo@ejemplo.test');
    await page.getByLabel('Teléfono').fill('71234567');
    await page.getByLabel('Mensaje').fill(mensaje);
    await page.getByRole('button', { name: 'Enviar al párroco' }).click();

    await expect(page.getByText('Gracias. Tu mensaje llegó al párroco.')).toBeVisible();

    // Párroco abre la bandeja, lee la observación (se marca leída) y verifica enlaces correo/WhatsApp
    const parroco = await abrirContextoConRol(browser, 'parroco');
    try {
      await parroco.page.goto('/admin/proclamas/observaciones');
      const botonObs = parroco.page.getByRole('button', { name: new RegExp(remitente) });
      await expect(botonObs).toBeVisible();
      await botonObs.click();

      const detalle = parroco.page.getByRole('article', {
        name: new RegExp(`Observación de ${remitente}`),
      });
      await expect(detalle).toBeVisible();
      await expect(detalle.getByText(mensaje)).toBeVisible();
      await expect(detalle.getByRole('button', { name: 'Marcar como no leída' })).toBeVisible();

      await expect(detalle.getByRole('link', { name: 'Enviar correo' })).toHaveAttribute(
        'href',
        new RegExp(`^mailto:testigo@ejemplo\\.test\\?subject=`),
      );
      await expect(detalle.getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveAttribute(
        'href',
        /^https:\/\/wa\.me\/59171234567\?text=/,
      );
    } finally {
      await parroco.context.close();
    }
  });
});
