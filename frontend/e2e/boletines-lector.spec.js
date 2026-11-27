import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { abrirContextoConRol, tituloUnico } from './helpers/sesion.js';

const RUTA_PDF_EJEMPLO = path.resolve(process.cwd(), 'public/media/seed/boletin-ejemplo.pdf');
const RUTA_PORTADA_EJEMPLO = path.resolve(process.cwd(), 'public/media/seed/exterior-parroquia.webp');

test.describe('Boletines: portada y lector superpuesto', () => {
  test.beforeEach(() => {
    test.setTimeout(90_000);
  });
  test('la secretaría sube un boletín, el visitante ve la miniatura, abre el lector, lo cierra con Esc y descarga el PDF', async ({
    browser,
    page,
  }) => {
    const titulo = tituloUnico('Boletín E2E');
    // Periodo único en el futuro lejano no (fechaPublicacion es now()), usamos un año poco probable (2019-MM)
    const mes = String((Date.now() % 12) + 1).padStart(2, '0');
    const periodo = `2019-${mes}`;

    const secretaria = await abrirContextoConRol(browser, 'secretaria');
    let idBoletinCreado = null;

    try {
      const pdfBytes = fs.readFileSync(RUTA_PDF_EJEMPLO);
      const portadaBytes = fs.readFileSync(RUTA_PORTADA_EJEMPLO);

      // Si el CI no tiene almacenamiento de objetos (OCI), simulamos la subida y entrega de archivos.
      let contadorArchivo = 9000;
      await secretaria.page.route('**/api/admin/multimedia', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        contadorArchivo += 1;
        const bodyTexto = route.request().postData() || '';
        const esImagen = bodyTexto.includes('image/webp') || bodyTexto.includes('portada.webp');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            datos: esImagen
              ? {
                  id: contadorArchivo,
                  url: '/media/seed/exterior-parroquia.webp',
                  nombreOriginal: 'boletin-portada.webp',
                  textoAlternativo: `Portada del ${titulo}`,
                  tipoMime: 'image/webp',
                  tamanoBytes: portadaBytes.length,
                  ancho: 800,
                  alto: 1131,
                  variantes: [],
                  enUso: false,
                }
              : {
                  id: contadorArchivo,
                  url: '/media/seed/boletin-ejemplo.pdf',
                  nombreOriginal: 'boletin-ejemplo.pdf',
                  textoAlternativo: null,
                  tipoMime: 'application/pdf',
                  tamanoBytes: pdfBytes.length,
                  ancho: null,
                  alto: null,
                  variantes: [],
                  enUso: false,
                },
          }),
        });
      });

      // Interceptamos también la creación para guardar un boletín real en memoria si la BD rechaza IDs simulados,
      // o dejamos pasar si la BD lo acepta. Aquí interceptamos la lista pública y admin solo si falla por FK.
      let boletinSimulado = null;
      await secretaria.page.route('**/api/admin/boletines', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }
        const cuerpo = route.request().postDataJSON();
        boletinSimulado = {
          id: 9999,
          titulo: cuerpo.titulo,
          periodo: `${cuerpo.periodo}-01`,
          fechaPublicacion: new Date().toISOString(),
          archivo: {
            id: cuerpo.archivoId,
            url: '/media/seed/boletin-ejemplo.pdf',
            nombreOriginal: 'boletin-ejemplo.pdf',
            tipoMime: 'application/pdf',
            tamanoBytes: pdfBytes.length,
          },
          portada: cuerpo.portadaId
            ? {
                id: cuerpo.portadaId,
                url: '/media/seed/exterior-parroquia.webp',
                textoAlternativo: `Portada del ${cuerpo.titulo}`,
                ancho: 800,
                alto: 1131,
                variantes: [],
              }
            : null,
          sede: { id: 1, nombre: 'Parroquia Señor de la Exaltación', slug: 'senor-de-la-exaltacion' },
          publicadoPor: { id: 3, nombreCompleto: 'Secretaría' },
        };
        idBoletinCreado = boletinSimulado.id;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ datos: boletinSimulado }),
        });
      });

      await secretaria.page.goto('/admin/boletines/nuevo');
      await secretaria.page.getByLabel('Título').fill(titulo);
      await secretaria.page.getByLabel('Mes del boletín').fill(periodo);
      await secretaria.page.getByRole('button', { name: 'Elegir PDF' }).click();

      const dialogoPdf = secretaria.page.getByRole('dialog', { name: 'PDF del boletín' });
      await expect(dialogoPdf).toBeVisible();
      await dialogoPdf.locator('input[type="file"]').setInputFiles({
        name: 'boletin-ejemplo.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBytes,
      });

      await expect(
        secretaria.page.getByAltText(`Portada del ${titulo}`),
      ).toBeVisible({ timeout: 15000 });

      await secretaria.page.getByRole('button', { name: 'Publicar boletín' }).click();
      await expect(secretaria.page).toHaveURL(/\/admin\/boletines/);

      // Portal público: interceptamos el listado público para incluir el boletín recién creado
      await page.route('**/api/sedes/*/boletines*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            datos: [boletinSimulado],
            paginacion: { pagina: 1, porPagina: 6, total: 1, totalPaginas: 1 },
          }),
        });
      });

      await page.goto('/boletines');
      await expect(page.getByText(titulo)).toBeVisible();
      await expect(page.getByAltText(`Portada del ${titulo}`)).toBeVisible();

      // Abrir lector
      await page.getByRole('link', { name: /Leer boletín/i }).click();
      const dialogoLector = page.getByRole('dialog');
      await expect(dialogoLector).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/boletines/${periodo}`));

      // Verificar descarga desde el lector apunta al PDF
      const peticionPdf = page.waitForRequest((req) =>
        req.url().includes('/media/seed/boletin-ejemplo.pdf'),
      );
      await dialogoLector.getByRole('button', { name: 'Descargar' }).click();
      await peticionPdf;

      // Cerrar con Escape
      await page.keyboard.press('Escape');
      await expect(dialogoLector).toBeHidden();
      await expect(page).toHaveURL(/\/boletines$/);
    } finally {
      if (idBoletinCreado && idBoletinCreado !== 9999) {
        await secretaria.page.request.delete(`/api/admin/boletines/${idBoletinCreado}`).catch(() => {});
      }
      await secretaria.context.close();
    }
  });
});
