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
      screen.getByText(
        'Tu mensaje es confidencial: solo lo lee el párroco y no se publica. Tu correo o tu celular solo sirven para responderte.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Puedes dejarlo vacío: tu observación llega igual y nadie más la ve.'),
    ).toBeInTheDocument();

    // Esperar a que llegue el token de verificación
    await waitFor(() => {
      expect(screen.getByLabelText('Tu nombre (opcional)')).toBeInTheDocument();
    });

    // Enviar vacío: el nombre es opcional, así que enfoca Correo electrónico por falta de contacto
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));
    expect(
      screen.getByText('Escribe tu correo o tu teléfono para que el párroco pueda responderte.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus();

    // Llenar nombre y mensaje pero sin correo ni teléfono -> sigue pidiendo contacto
    await usuario.type(screen.getByLabelText('Tu nombre (opcional)'), 'María Elena Quispe');
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

    await usuario.type(screen.getByLabelText('Tu nombre (opcional)'), 'Juan Pérez');
    await usuario.type(screen.getByLabelText('Correo electrónico'), 'juan@ejemplo.com');
    await usuario.type(screen.getByLabelText('Mensaje'), 'Mensaje de prueba para validar 429.');
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));

    await waitFor(() => {
      expect(
        screen.getByText('Has enviado demasiadas observaciones en poco tiempo. Inténtalo más tarde.'),
      ).toBeInTheDocument();
    });
  });

  it('permite enviar una observación anónima sin nombre y reintenta token si falla verificación', async () => {
    let llamadasToken = 0;
    let primerIntento = true;
    server.use(
      http.get(api('/sedes/:sede/proclamas/:id/observaciones/verificacion'), () => {
        llamadasToken += 1;
        return HttpResponse.json({ datos: { token: `token-${llamadasToken}` } });
      }),
      http.post(api('/sedes/:sede/proclamas/:id/observaciones'), async ({ request }) => {
        const cuerpo = await request.json();
        if (primerIntento) {
          primerIntento = false;
          return HttpResponse.json(
            {
              error: {
                codigo: 'VALIDACION',
                mensaje: 'Los datos enviados no son válidos.',
                detalles: [
                  {
                    campo: 'verificacion',
                    mensaje: 'No pudimos verificar el envío. Vuelve a cargar la página e inténtalo de nuevo.',
                  },
                ],
              },
            },
            { status: 400 },
          );
        }
        expect(cuerpo.nombreCompleto).toBeNull();
        expect(cuerpo.verificacion).toBe('token-2');
        return HttpResponse.json({ datos: { recibido: true } }, { status: 201 });
      }),
    );

    const usuario = userEvent.setup();
    renderConRouterYQuery(<FormularioObservacionProclama proclamaId={1} />);

    await waitFor(() => {
      expect(llamadasToken).toBe(1);
    });

    await usuario.type(screen.getByLabelText('Correo electrónico'), 'anonima@ejemplo.com');
    await usuario.type(screen.getByLabelText('Mensaje'), 'Observación anónima de prueba.');
    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));

    expect(
      await screen.findByText(
        'No pudimos verificar el envío. Vuelve a cargar la página e inténtalo de nuevo.',
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(llamadasToken).toBe(2);
    });

    await usuario.click(screen.getByRole('button', { name: 'Enviar al párroco' }));
    expect(await screen.findByText('Gracias. Tu mensaje llegó al párroco.')).toBeInTheDocument();
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
