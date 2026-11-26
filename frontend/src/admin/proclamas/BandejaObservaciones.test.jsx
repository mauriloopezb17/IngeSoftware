import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';

import { clienteHttp } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { SesionProvider } from '../sesion/SesionProvider.jsx';
import { ProveedorToasts } from '../ui/index.js';
import { armarHrefCorreo, armarHrefWhatsApp, normalizarTelefonoWhatsApp } from './observacionesEnlaces.js';
import Proclamas from './Proclamas.jsx';

const entrar = (usuario) =>
  clienteHttp.post('/auth/login', { correo: `${usuario}@parroquia.test`, contrasena: CONTRASENA_DESARROLLO });

function montar(entrada = '/admin/proclamas') {
  return render(
    <QueryClientProvider client={crearQueryClient()}>
      <ProveedorToasts>
        <SesionProvider>
          <MemoryRouter initialEntries={[entrada]}>
            <Routes>
              <Route path="/admin/proclamas/*" element={<Proclamas />} />
            </Routes>
          </MemoryRouter>
        </SesionProvider>
      </ProveedorToasts>
    </QueryClientProvider>,
  );
}

describe('BandejaObservaciones (bandeja del párroco)', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(reiniciarMocksAdmin);

  it('no aparece para Secretaría ni Marketing y bloquea la ruta directa', async () => {
    await entrar('secretaria');
    montar('/admin/proclamas');
    await screen.findByRole('list', { name: 'Proclamas' });
    expect(screen.queryByRole('link', { name: /Observaciones/ })).not.toBeInTheDocument();

    await entrar('marketing');
    montar('/admin/proclamas/observaciones');
    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
  });

  it('muestra insignia, marca leída al abrir, arma enlaces mailto/WhatsApp, oculta acciones sin dato y elimina', async () => {
    await entrar('parroco');
    montar('/admin/proclamas/observaciones');
    const usuario = userEvent.setup();

    expect(await screen.findByText('Estas observaciones son confidenciales. Solo el párroco puede verlas.')).toBeInTheDocument();
    const tabObs = screen.getByRole('link', { name: /Observaciones/ });
    expect(await within(tabObs).findByText('2')).toBeInTheDocument();

    // Abrir la primera observación (María Elena Quispe: tiene correo y teléfono local 71234567)
    const lista = await screen.findByRole('list', { name: 'Observaciones recibidas' });
    await usuario.click(within(lista).getByRole('button', { name: /María Elena Quispe/ }));

    const detalle = await screen.findByRole('article', { name: /Observación de María Elena Quispe/ });
    expect(within(detalle).getByRole('link', { name: 'Enviar correo' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:maria.quispe@ejemplo.test?subject=Sobre%20la%20proclama%20de%20'),
    );
    expect(within(detalle).getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/59171234567?text='),
    );
    expect(within(detalle).getByRole('link', { name: 'Llamar' })).toHaveAttribute('href', 'tel:71234567');

    // Al abrirla quedó leída: la insignia baja a 1
    await waitFor(() => {
      expect(within(tabObs).getByText('1')).toBeInTheDocument();
    });

    // Cambiar a "Todas" y abrir la de Carlos Mamani (solo correo, sin teléfono)
    await usuario.click(screen.getByRole('button', { name: 'Todas' }));
    await usuario.click(await screen.findByRole('button', { name: /Carlos Mamani/ }));
    const detalleCarlos = await screen.findByRole('article', { name: /Observación de Carlos Mamani/ });
    expect(within(detalleCarlos).getByRole('link', { name: 'Enviar correo' })).toBeInTheDocument();
    expect(within(detalleCarlos).queryByRole('link', { name: 'Escribir por WhatsApp' })).not.toBeInTheDocument();
    expect(within(detalleCarlos).queryByRole('link', { name: 'Llamar' })).not.toBeInTheDocument();

    // Eliminar observación con confirmación y toast
    await usuario.click(within(detalleCarlos).getByRole('button', { name: 'Eliminar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('Se eliminará la observación de forma permanente.')).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Observación eliminada.')).toBeInTheDocument();
  });

  it('normaliza teléfonos bolivianos para WhatsApp', () => {
    expect(normalizarTelefonoWhatsApp('7123-4567')).toBe('59171234567');
    expect(normalizarTelefonoWhatsApp('6543 2100')).toBe('59165432100');
    expect(normalizarTelefonoWhatsApp('+591 7123-4567')).toBe('59171234567');
    expect(
      armarHrefCorreo({
        correo: 'a@b.com',
        proclama: { contrayente1: 'Juan', contrayente2: 'Ana' },
      }),
    ).toBe('mailto:a@b.com?subject=Sobre%20la%20proclama%20de%20Juan%20y%20Ana');
    expect(
      armarHrefWhatsApp({
        nombreCompleto: 'Luis',
        telefono: '71234567',
        proclama: { contrayente1: 'Juan', contrayente2: 'Ana' },
      }),
    ).toContain('https://wa.me/59171234567?text=');
  });
});
