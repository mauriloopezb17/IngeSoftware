// Helpers de limpieza por API con la sesión del Administrador para dejar la base intacta.
import { request as playwrightRequest } from '@playwright/test';
import { CONTRASENA_DEV, USUARIOS_POR_ROL } from './sesion.js';

const BASE_URL = `http://localhost:${process.env.E2E_PUERTO_WEB || '5173'}`;

async function conAdmin(_browser, tarea) {
  const api = await playwrightRequest.newContext({ baseURL: BASE_URL });
  try {
    const res = await api.post('/api/auth/login', {
      data: { correo: USUARIOS_POR_ROL.admin, contrasena: CONTRASENA_DEV },
    });
    if (!res.ok()) return;
    await tarea(api);
  } finally {
    await api.dispose();
  }
}

export async function eliminarPublicacionAdmin(browser, id) {
  if (!id) return;
  await conAdmin(browser, async (api) => {
    await api.post(`/api/admin/publicaciones/${id}/archivar`).catch(() => {});
    await api.delete(`/api/admin/publicaciones/${id}`).catch(() => {});
  });
}

export async function eliminarEventoAdmin(browser, id) {
  if (!id) return;
  await conAdmin(browser, async (api) => {
    await api.delete(`/api/admin/eventos/${id}`).catch(() => {});
  });
}

export async function eliminarProclamaAdmin(browser, id) {
  if (!id) return;
  await conAdmin(browser, async (api) => {
    await api.delete(`/api/admin/proclamas/${id}`).catch(() => {});
  });
}

export async function eliminarGrupoAdmin(browser, id) {
  if (!id) return;
  await conAdmin(browser, async (api) => {
    await api.delete(`/api/admin/grupos-pastorales/${id}`).catch(() => {});
  });
}
