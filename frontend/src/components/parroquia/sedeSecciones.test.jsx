import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConQuery } from '../../test/utilidadesQuery.jsx';
import Encabezado from './Encabezado.jsx';
import Contacto from './Contacto.jsx';
import PiePagina from './PiePagina.jsx';

describe('Encabezado, Contacto y PiePagina desde la sede', () => {
  it('renderiza los datos de la sede en Encabezado, Contacto y PiePagina', async () => {
    renderConQuery(
      <>
        <Encabezado />
        <Contacto />
        <PiePagina />
      </>,
    );

    expect(
      await screen.findByText('Hoy, sábado: Santa Misa 7:00 · 18:00 (vespertina dominical)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Av. Héctor Ormachea N.º 167, Obrajes, La Paz'),
    ).toBeInTheDocument();
    expect(screen.getAllByText('(2) 278 4937').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Lun – Vie: 9:00 – 12:00')).toBeInTheDocument();
    expect(
      screen.getByText(
        '© 2026 Parroquia Señor de la Exaltación · Pasionistas Bolivia · pasionistas.org.bo',
      ),
    ).toBeInTheDocument();
  });

  it('muestra error con Reintentar en Contacto y PiePagina cuando /sedes/:sede falla con 500', async () => {
    const usuario = userEvent.setup();
    let fallo = true;

    server.use(
      http.get(api('/sedes/:sede'), ({ params }) => {
        if (fallo) {
          return HttpResponse.json(
            { error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno' } },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          datos: {
            id: 1,
            nombre: 'Parroquia Señor de la Exaltación',
            slug: params.sede,
            direccion: 'Av. Héctor Ormachea N.º 167, Obrajes, La Paz',
            telefono: '(2) 278 4937',
            whatsapp: null,
            correo: 'parroquia.exaltacion.obrajes@gmail.com',
            redesSociales: [],
            configuracion: {
              descripcionPie: 'Descripción recuperada',
            },
          },
        });
      }),
    );

    renderConQuery(
      <>
        <Contacto />
        <PiePagina />
      </>,
    );

    expect(
      await screen.findByText('No pudimos cargar la información de contacto.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No pudimos cargar los datos institucionales.'),
    ).toBeInTheDocument();

    fallo = false;
    const botones = screen.getAllByRole('button', { name: 'Reintentar' });
    await usuario.click(botones[0]);

    await waitFor(() => {
      expect(
        screen.getByText('Av. Héctor Ormachea N.º 167, Obrajes, La Paz'),
      ).toBeInTheDocument();
      expect(screen.getByText('Descripción recuperada')).toBeInTheDocument();
    });
  });

  it('muestra estado sin resultados en Contacto cuando la sede llega vacía', async () => {
    server.use(http.get(api('/sedes/:sede'), () => HttpResponse.json({ datos: null })));

    renderConQuery(<Contacto />);

    expect(
      await screen.findByText('No hay información de contacto disponible.'),
    ).toBeInTheDocument();
  });
});
