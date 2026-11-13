// Pruebas unitarias de reglas críticas de usuarios (último Administrador activo).
import { describe, expect, it, vi } from 'vitest';
import { ErrorApp } from '../../src/errores/ErrorApp.js';

vi.mock('../../src/db/index.js', () => ({
  transaccion: async (fn) => fn({ consultar: vi.fn() }),
  consultar: vi.fn(),
}));

vi.mock('../../src/models/usuarios.model.js', () => ({
  filaParaModificar: vi.fn(async () => ({
    id: 10,
    rol_id: 1,
    rol_nombre: 'Administrador',
    sede_id: null,
    nombre_completo: 'Único Admin',
    correo: 'unico@parroquia.test',
    activo: true,
  })),
  contarAdminsActivosExcluyendo: vi.fn(async () => 0),
  existeSede: vi.fn(async () => true),
  existeOtroCorreo: vi.fn(async () => false),
}));

const { actualizarUsuario } = await import('../../src/services/adminUsuarios.service.js');

describe('adminUsuarios.service (último Administrador activo)', () => {
  it('impide desactivar al último Administrador activo del sistema (409 CONFLICTO)', async () => {
    await expect(
      actualizarUsuario({ id: 99, rol: 'ADMINISTRADOR' }, 10, { activo: false }, {}),
    ).rejects.toMatchObject({
      codigo: 'CONFLICTO',
      estado: 409,
    });
  });

  it('impide cambiar el rol del último Administrador activo del sistema (409 CONFLICTO)', async () => {
    await expect(
      actualizarUsuario({ id: 99, rol: 'ADMINISTRADOR' }, 10, { rol: 'PARROCO', sedeId: 1 }, {}),
    ).rejects.toBeInstanceOf(ErrorApp);
  });
});
