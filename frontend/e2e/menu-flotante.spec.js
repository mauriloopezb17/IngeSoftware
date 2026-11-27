import { expect, test } from '@playwright/test';

test.describe('Menú flotante de accesos rápidos en escritorio', () => {
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });
  test('aparece al bajar en la portada, despliega, navega a Calendario y desaparece al volver arriba', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const tarjetas = page.locator('[data-portada-tarjetas]');
    await expect(tarjetas).toBeVisible();

    const botonAccesos = page.getByRole('button', { name: 'Accesos' });
    await expect(botonAccesos).toBeHidden();

    // Bajar en la portada hasta sacar las tarjetas de vista
    await page.locator('#horarios').scrollIntoViewIfNeeded();
    await expect(botonAccesos).toBeVisible();

    // Desplegar e ir a Calendario
    await botonAccesos.click();
    await expect(botonAccesos).toHaveAttribute('aria-expanded', 'true');
    const menuFlotante = page.getByRole('navigation', { name: 'Accesos rápidos' });
    const enlaceCalendario = menuFlotante.getByRole('link', { name: 'Ir a Calendario' });
    await expect(enlaceCalendario).toBeVisible();
    await enlaceCalendario.click();

    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Volver al inicio y subir: la barra desaparece y se ven las tarjetas
    await page.goto('/');
    await page.locator('#horarios').scrollIntoViewIfNeeded();
    await expect(botonAccesos).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(tarjetas).toBeInViewport();
    await expect(botonAccesos).toBeHidden();
  });
});
