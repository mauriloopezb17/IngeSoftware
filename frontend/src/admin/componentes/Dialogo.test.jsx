import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dialogo from './Dialogo.jsx';

function Ejemplo() {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button onClick={() => setAbierto(true)}>Abrir</button>
      {abierto && (
        <Dialogo titulo="Título del diálogo" onCerrar={() => setAbierto(false)}>
          <button>Primero</button>
          <button>Último</button>
        </Dialogo>
      )}
    </>
  );
}

async function abrir() {
  const usuario = userEvent.setup();
  render(<Ejemplo />);
  const disparador = screen.getByRole('button', { name: 'Abrir' });
  await usuario.click(disparador);
  return { usuario, disparador };
}

describe('Dialogo', () => {
  it('es un diálogo modal con su título como nombre y recibe el foco', async () => {
    await abrir();

    const dialogo = screen.getByRole('dialog', { name: 'Título del diálogo' });
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveFocus();
  });

  it('atrapa el foco: Tab desde el último vuelve al primero y Shift+Tab al revés', async () => {
    const { usuario } = await abrir();
    const cerrar = screen.getByRole('button', { name: 'Cerrar' });
    const ultimo = screen.getByRole('button', { name: 'Último' });

    ultimo.focus();
    await usuario.tab();
    expect(cerrar).toHaveFocus();

    await usuario.tab({ shift: true });
    expect(ultimo).toHaveFocus();
  });

  it('con Shift+Tab desde el propio diálogo pasa al último elemento', async () => {
    const { usuario } = await abrir();

    await usuario.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });

  it('se cierra con Escape y devuelve el foco a quien lo abrió', async () => {
    const { usuario, disparador } = await abrir();

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(disparador).toHaveFocus();
  });

  it('se cierra al pulsar el fondo, pero no al pulsar dentro del diálogo', async () => {
    const { usuario } = await abrir();

    await usuario.click(screen.getByRole('button', { name: 'Primero' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await usuario.click(document.querySelector('[aria-hidden="true"].absolute'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bloquea el desplazamiento de la página mientras está abierto', async () => {
    const { usuario } = await abrir();
    expect(document.body.style.overflow).toBe('hidden');

    await usuario.keyboard('{Escape}');

    expect(document.body.style.overflow).toBe('');
  });

  it('si quien lo abrió desaparece mientras está abierto (fila eliminada), el foco pasa al contenido principal', async () => {
    function ConFila() {
      const [hayFila, setHayFila] = useState(true);
      const [abierto, setAbierto] = useState(false);
      return (
        <main id="contenido" tabIndex={-1}>
          {hayFila && <button onClick={() => setAbierto(true)}>Eliminar fila</button>}
          {abierto && (
            <Dialogo
              titulo="¿Eliminar?"
              onCerrar={() => {
                setAbierto(false);
                setHayFila(false);
              }}
            >
              <button>Aceptar</button>
            </Dialogo>
          )}
        </main>
      );
    }
    const usuario = userEvent.setup();
    render(<ConFila />);

    await usuario.click(screen.getByRole('button', { name: 'Eliminar fila' }));
    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('button', { name: 'Eliminar fila' })).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });
});
