import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { http, HttpResponse } from 'msw';

import { server } from '../../mocks/server.js';
import { api } from '../../mocks/api.js';
import { renderConRouterYQuery } from '../../test/utilidadesQuery.jsx';
import ProclamaDetalle from '../../pages/ProclamaDetalle.jsx';
import FormularioObservacionProclama from './FormularioObservacionProclama.jsx';

describe('FormularioObservacionProclama', () => {
  it('valida campos, enfoca el primer error y envía sin volver a mostrar datos', async () => {
    const usuario = userEvent.setup();
    renderConRouterYQuery(<FormularioObservacionProclama proclamaId={1} />);

    expect(
      screen.getByRole('heading', { name: '¿Conoces algún impedimento para este matrimonio?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Tu mensaje es confidencial: solo lo lee el párroco y no se publica.'),
    ).toBeInTheDocument();

    // Enviar vacío: enfoca el primer campo con error (Nombre completo)
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));
    const inputNombre = screen.getByLabelText('Nombre completo');
    expect(inputNombre).toHaveFocus();
    expect(inputNombre).toHaveAttribute('aria-invalid', 'true');

    // Llenar nombre y mensaje pero sin correo ni teléfono -> enfoca correo por error en contacto
    await usuario.type(inputNombre, 'María Elena Quispe');
    await usuario.type(
      screen.getByLabelText('Mensaje'),
      'Mensaje confidencial de prueba para el párroco.',
    );
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));
    expect(
      screen.getByText('Escribe tu correo o tu teléfono para que el párroco pueda responderte.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();

    // Agregar teléfono local y enviar correctamente
    await usuario.type(screen.getByLabelText('Teléfono'), '71234567');
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));

    const confirmacion = await screen.findByText('Gracias. Tu mensaje llegó al párroco.');
    expect(confirmacion).toBeInTheDocument();
    await waitFor(() => {
      expect(confirmacion.closest('[tabindex="-1"]')).toHaveFocus();
    });
    // No vuelve a mostrar los datos enviados
    expect(screen.queryByText('María Elena Quispe')).not.toBeInTheDocument();
    expect(screen.queryByText('71234567')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Mensaje confidencial de prueba para el párroco.'),
    ).not.toBeInTheDocument();
  });

  it('muestra el error 429 cuando se supera el límite de envíos', async () => {
    server.use(
      http.post(api('/sedes/:sede/proclamas/:id/observaciones'), () =>
        HttpResponse.json(
          {
            error: {
              codigo: 'DEMASIADAS_SOLICITUDES',
              mensaje: 'Has enviado demasiadas observaciones en poco tiempo. Inténtalo más tarde.',
              detalles: [],
            },
          },
          { status: 429 },
        ),
      ),
    );

    const usuario = userEvent.setup();
    renderConRouterYQuery(<FormularioObservacionProclama proclamaId={1} />);

    await usuario.type(screen.getByLabelText('Nombre completo'), 'Juan Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'juan@ejemplo.com');
    await usuario.type(screen.getByLabelText('Mensaje'), 'Mensaje de prueba para validar 429.');
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));

    await waitFor(() => {
      expect(
        screen.getByText('Has enviado demasiadas observaciones en poco tiempo. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('oculta el formulario en ProclamaDetalle cuando aceptaObservaciones es false', async () => {
    renderConRouterYQuery(
      <Routes>
        <Route path="/proclamas/:id" element={<ProclamaDetalle />} />
      </Routes>,
      ['/proclamas/4'],
    );

    expect(await screen.findByText('Esta proclama ya no recibe observaciones.')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '¿Conoces algún impedimento para este matrimonio?' }),
    ).not.toBeInTheDocument();
  });
});
