import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { api } from '../../mocks/api.js';
import { server } from '../../mocks/server.js';
import { clienteHttp, ErrorApi } from '../../services/clienteHttp.js';
import { crearQueryClient } from '../../services/queryClient.js';
import { reiniciarMocksAdmin } from '../mocks/handlers.js';
import { CONTRASENA_DESARROLLO } from '../mocks/usuarios.js';
import { CLAVE_SESION } from './api.js';
import { SesionProvider } from './SesionProvider.jsx';
import { useSesion } from './SesionContexto.js';

// Componente de prueba: muestra el estado de la sesión y expone botones para accionarla.
function Sonda() {
  const { usuario, cargando, error, iniciarSesion, cerrarSesion } = useSesion();
  const consultaAjena = useQuery({
    queryKey: ['admin', 'ajena'],
    queryFn: () => clienteHttp.get('/admin/prueba'),
    enabled: false,
    retry: false,
  });
  const mutacionAjena = useMutation({ mutationFn: () => clienteHttp.post('/admin/prueba', {}) });

  const intentar = (correo, contrasena) =>
    iniciarSesion({ correo, contrasena }).catch((e) => {
      document.body.dataset.errorLogin = `${e.estado} ${e.codigo}`;
    });

  return (
    <div>
      <p>{cargando ? 'cargando' : usuario ? `sesión: ${usuario.correo}` : 'sin sesión'}</p>
      {error && <p>error: {error.estado}</p>}
      {consultaAjena.error && <p>consulta ajena falló: {consultaAjena.error.estado}</p>}
      <button onClick={() => intentar('marketing@parroquia.test', CONTRASENA_DESARROLLO)}>
        entrar
      </button>
      <button onClick={() => intentar('marketing@parroquia.test', 'mala')}>entrar mal</button>
      <button onClick={() => cerrarSesion()}>salir</button>
      <button onClick={() => consultaAjena.refetch()}>consulta ajena</button>
      <button onClick={() => mutacionAjena.mutate()}>mutación ajena</button>
    </div>
  );
}

function montar(cliente = crearQueryClient()) {
  const resultado = render(
    <QueryClientProvider client={cliente}>
      <SesionProvider>
        <Sonda />
      </SesionProvider>
    </QueryClientProvider>,
  );
  return { cliente, ...resultado };
}

const responderError = (estado, codigo) => () =>
  HttpResponse.json({ error: { codigo, mensaje: 'Error de prueba.', detalles: [] } }, { status: estado });

const TEXTO_SESION = 'sesión: marketing@parroquia.test';

async function entrar() {
  await userEvent.click(await screen.findByText('entrar'));
  await screen.findByText(TEXTO_SESION);
}

describe('SesionProvider', () => {
  beforeEach(reiniciarMocksAdmin);
  afterEach(() => {
    reiniciarMocksAdmin();
    delete document.body.dataset.errorLogin;
  });

  it('trata el 401 de /auth/yo como "sin sesión", no como error', async () => {
    montar();

    expect(screen.getByText('cargando')).toBeInTheDocument();
    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    expect(screen.queryByText(/error:/)).not.toBeInTheDocument();
  });

  it('recupera la sesión existente al cargar (por ejemplo tras recargar la página)', async () => {
    const { unmount } = montar();
    await entrar();
    unmount();

    montar(); // cliente nuevo = página recargada
    expect(await screen.findByText(TEXTO_SESION)).toBeInTheDocument();
  });

  it('login correcto deja disponible el usuario', async () => {
    montar();
    await entrar();

    expect(screen.getByText(TEXTO_SESION)).toBeInTheDocument();
  });

  it('un 401 del login (credenciales malas) NO se trata como sesión expirada', async () => {
    montar();
    await entrar();

    await userEvent.click(screen.getByText('entrar mal'));

    await waitFor(() => expect(document.body.dataset.errorLogin).toBe('401 NO_AUTENTICADO'));
    expect(screen.getByText(TEXTO_SESION)).toBeInTheDocument();
  });

  it('logout cierra la sesión', async () => {
    montar();
    await entrar();

    await userEvent.click(screen.getByText('salir'));

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    await expect(clienteHttp.get('/auth/yo')).rejects.toMatchObject({ estado: 401 });
  });

  it('logout deja la sesión cerrada en pantalla aunque falle la red', async () => {
    montar();
    await entrar();

    server.use(
      http.post(api('/auth/logout'), () => HttpResponse.error()),
      http.get(api('/auth/yo'), () => HttpResponse.error()),
    );
    await userEvent.click(screen.getByText('salir'));

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
  });

  it('un 401 en una consulta del panel cierra la sesión en pantalla', async () => {
    server.use(http.get(api('/admin/prueba'), responderError(401, 'NO_AUTENTICADO')));
    montar();
    await entrar();

    await userEvent.click(screen.getByText('consulta ajena'));

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
  });

  it('un 401 en una mutación del panel cierra la sesión en pantalla', async () => {
    server.use(http.post(api('/admin/prueba'), responderError(401, 'NO_AUTENTICADO')));
    montar();
    await entrar();

    await userEvent.click(screen.getByText('mutación ajena'));

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
  });

  it('un 403 no cierra la sesión', async () => {
    server.use(http.get(api('/admin/prueba'), responderError(403, 'SIN_PERMISO')));
    montar();
    await entrar();

    await userEvent.click(screen.getByText('consulta ajena'));

    expect(await screen.findByText('consulta ajena falló: 403')).toBeInTheDocument();
    expect(screen.getByText(TEXTO_SESION)).toBeInTheDocument();
  });

  it('otros errores de /auth/yo sí se informan', async () => {
    server.use(http.get(api('/auth/yo'), () => new HttpResponse(null, { status: 500 })));
    montar();

    expect(await screen.findByText('error: 500')).toBeInTheDocument();
  });

  it('deja de escuchar los 401 al desmontar el proveedor', async () => {
    server.use(http.get(api('/admin/prueba'), responderError(401, 'NO_AUTENTICADO')));
    const cliente = crearQueryClient();
    const { unmount } = montar(cliente);
    await screen.findByText('sin sesión');
    unmount();

    cliente.setQueryData(CLAVE_SESION, { id: 9 });
    await expect(
      cliente.fetchQuery({
        queryKey: ['admin', 'ajena'],
        queryFn: () => clienteHttp.get('/admin/prueba'),
        retry: false,
      }),
    ).rejects.toBeInstanceOf(ErrorApi);

    expect(cliente.getQueryData(CLAVE_SESION)).toEqual({ id: 9 });
  });

  it('useSesion fuera del proveedor lanza un error claro', () => {
    const consola = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Sonda />)).toThrow(/SesionProvider/);
    } finally {
      console.error = consola;
    }
  });
});
