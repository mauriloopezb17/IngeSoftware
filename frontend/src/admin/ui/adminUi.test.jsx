import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router';
import { Inbox, Plus } from 'lucide-react';

import {
  Aviso,
  Boton,
  CampoArea,
  CampoCasilla,
  CampoSelect,
  CampoTexto,
  CeldaTabla,
  EncabezadoPantalla,
  EsqueletoFormulario,
  EsqueletoTabla,
  EsqueletoTarjetas,
  EstadoVacio,
  FilaTabla,
  Insignia,
  ProveedorToasts,
  Tabla,
  useToast,
} from './index.js';

function DemoToasts() {
  const { exito, error, info } = useToast();
  return (
    <div>
      <button type="button" onClick={() => exito('Cambios guardados.')}>
        Disparar éxito
      </button>
      <button type="button" onClick={() => error('Ocurrió un error.')}>
        Disparar error
      </button>
      <button type="button" onClick={() => info('Sesión verificada.')}>
        Disparar info
      </button>
    </div>
  );
}

describe('componentes base del panel (admin/ui)', () => {
  it('Boton renderiza variantes, estado cargando con aria-busy y versión Link', async () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <Boton variante="primario" icono={Plus} onClick={onClick}>
          Guardar
        </Boton>
        <Boton variante="peligro" cargando onClick={onClick}>
          Eliminando
        </Boton>
        <Boton como={Link} to="/admin/publicaciones/nueva" variante="secundario">
          Ir a nueva
        </Boton>
      </MemoryRouter>,
    );

    const primario = screen.getByRole('button', { name: 'Guardar' });
    expect(primario.className).toContain('bg-gold');
    expect(primario.className).toContain('text-ink');
    await userEvent.click(primario);
    expect(onClick).toHaveBeenCalledTimes(1);

    const cargando = screen.getByRole('button', { name: 'Eliminando' });
    expect(cargando).toBeDisabled();
    expect(cargando).toHaveAttribute('aria-busy', 'true');

    const enlace = screen.getByRole('link', { name: 'Ir a nueva' });
    expect(enlace).toHaveAttribute('href', '/admin/publicaciones/nueva');
  });

  it('Insignia aplica estilos semánticos por variante', () => {
    render(
      <div>
        <Insignia variante="publicado">Publicado</Insignia>
        <Insignia variante="rechazado">Rechazada</Insignia>
        <Insignia variante="revision">En revisión</Insignia>
      </div>,
    );

    expect(screen.getByText('Publicado').className).toContain('bg-success-soft');
    expect(screen.getByText('Rechazada').className).toContain('bg-danger-soft');
    expect(screen.getByText('En revisión').className).toContain('bg-ink');
  });

  it('CampoTexto, CampoArea, CampoSelect y CampoCasilla asocian ayuda, error y contador', () => {
    render(
      <form>
        <CampoTexto label="No" etiqueta="Título" ayuda="Entre 3 y 200 caracteres." error="Falta el título." />
        <CampoArea etiqueta="Resumen" maxLength={100} value="Texto breve" onChange={() => {}} mostrarContador />
        <CampoSelect etiqueta="Sede" error="Elige una sede.">
          <option value="1">Obrajes</option>
        </CampoSelect>
        <CampoCasilla etiqueta="Destacar en portada" ayuda="Se verá arriba del portal." />
      </form>,
    );

    const inputTitulo = screen.getByLabelText('Título');
    expect(inputTitulo).toHaveAttribute('aria-invalid', 'true');
    expect(inputTitulo).toHaveAccessibleDescription('Entre 3 y 200 caracteres. Falta el título.');
    expect(screen.getByText('11/100')).toBeInTheDocument();

    const selectSede = screen.getByLabelText('Sede');
    expect(selectSede).toHaveAttribute('aria-invalid', 'true');

    const casilla = screen.getByLabelText('Destacar en portada');
    expect(casilla).toHaveAttribute('type', 'checkbox');
    expect(casilla).toHaveAccessibleDescription('Se verá arriba del portal.');
  });

  it('Tabla, EstadoVacio, Esqueleto y Aviso renderizan sus roles accesibles', () => {
    render(
      <div>
        <EncabezadoPantalla titulo="Eventos" descripcion="Agenda parroquial." acciones={<Boton>Nuevo evento</Boton>} />
        <Tabla caption="Listado de eventos" encabezados={['Evento', 'Fecha']}>
          <FilaTabla>
            <CeldaTabla>Misa solemne</CeldaTabla>
            <CeldaTabla>Domingo 10:00</CeldaTabla>
          </FilaTabla>
        </Tabla>
        <EstadoVacio icono={Inbox} titulo="Sin registros" descripcion="Crea el primer elemento." accion={<Boton>Crear</Boton>} />
        <EsqueletoTabla filas={2} columnas={2} etiqueta="Cargando eventos…" />
        <EsqueletoTarjetas cantidad={2} etiqueta="Cargando tarjetas…" />
        <EsqueletoFormulario campos={2} etiqueta="Cargando formulario…" />
        <Aviso tipo="error" titulo="Error">
          No se pudo guardar.
        </Aviso>
      </div>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument();
    const tabla = screen.getByRole('table', { name: 'Listado de eventos' });
    expect(within(tabla).getByText('Misa solemne')).toBeInTheDocument();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(3);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo guardar.');
  });

  it('ProveedorToasts apila hasta 3 notificaciones sin robar el foco y permite cerrarlas', async () => {
    const usuario = userEvent.setup();
    render(
      <ProveedorToasts>
        <DemoToasts />
      </ProveedorToasts>,
    );

    const btnExito = screen.getByRole('button', { name: 'Disparar éxito' });
    const btnError = screen.getByRole('button', { name: 'Disparar error' });
    const btnInfo = screen.getByRole('button', { name: 'Disparar info' });

    await usuario.click(btnExito);
    await usuario.click(btnInfo);
    await usuario.click(btnError);
    await usuario.click(btnExito);

    expect(btnExito).toHaveFocus();
    const notificaciones = screen.getByLabelText('Notificaciones');
    expect(within(notificaciones).getAllByRole('button', { name: 'Cerrar notificación' })).toHaveLength(3);

    await usuario.click(within(notificaciones).getAllByRole('button', { name: 'Cerrar notificación' })[0]);
    expect(within(notificaciones).getAllByRole('button', { name: 'Cerrar notificación' })).toHaveLength(2);
  });
});
