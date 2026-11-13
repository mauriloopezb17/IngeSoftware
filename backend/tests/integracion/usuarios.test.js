// Creación de administradores contra el PostgreSQL de DATABASE_URL. Cada prueba borra lo que crea.
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { cerrarPool, consultar, transaccion } from '../../src/db/index.js';
import { ErrorApp } from '../../src/errores/ErrorApp.js';
import { crearAdministrador } from '../../src/services/usuarios.service.js';
import { verificarContrasena } from '../../src/utils/contrasenas.js';

const correosCreados = [];
const correoUnico = () => {
  const correo = `prueba-${randomUUID()}@parroquia.test`;
  correosCreados.push(correo);
  return correo;
};

// Borra los usuarios creados y el registro de su creación en la bitácora.
afterEach(async () => {
  const correos = correosCreados.splice(0);
  await consultar(
    `DELETE FROM bitacora_cambio
      WHERE entidad = 'usuario'
        AND entidad_id IN (SELECT id::text FROM usuario WHERE correo = ANY($1))`,
    [correos],
  );
  await consultar('DELETE FROM usuario WHERE correo = ANY($1)', [correos]);
});

afterAll(async () => {
  await cerrarPool();
});

describe('crearAdministrador', () => {
  it('crea un Administrador sin sede con la contraseña guardada como hash argon2id', async () => {
    const correo = correoUnico();

    const creado = await crearAdministrador({
      correo: `  ${correo.toUpperCase()}  `,
      nombreCompleto: '  Soporte Técnico  ',
      contrasena: 'Exaltacion-Obrajes-167',
    });

    expect(creado).toEqual({ id: expect.any(Number), correo, nombreCompleto: 'Soporte Técnico' });

    const { rows } = await consultar(
      `SELECT r.nombre AS rol, u.sede_id, u.activo, u.hash_contrasena
         FROM usuario u JOIN rol r ON r.id = u.rol_id
        WHERE u.correo = $1`,
      [correo],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ rol: 'Administrador', sede_id: null, activo: true });
    expect(rows[0].hash_contrasena).toMatch(/^\$argon2id\$/);
    expect(rows[0].hash_contrasena).not.toContain('Exaltacion');
    expect(await verificarContrasena('Exaltacion-Obrajes-167', rows[0].hash_contrasena)).toBe(true);
  });

  it('rechaza un correo repetido con CONFLICTO', async () => {
    const correo = correoUnico();
    const datos = { correo, nombreCompleto: 'Soporte', contrasena: 'Exaltacion-Obrajes-167' };
    await crearAdministrador(datos);

    const error = await crearAdministrador(datos).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorApp);
    expect(error.codigo).toBe('CONFLICTO');
    expect(error.detalles).toEqual([{ campo: 'correo', mensaje: 'Ya está registrado.' }]);
  });

  it('rechaza datos inválidos con un detalle por campo y no escribe nada', async () => {
    const error = await crearAdministrador({
      correo: 'no-es-un-correo',
      nombreCompleto: '   ',
      contrasena: 'corta',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ErrorApp);
    expect(error.codigo).toBe('VALIDACION');
    expect(error.detalles.map((detalle) => detalle.campo).sort()).toEqual([
      'contrasena',
      'correo',
      'nombreCompleto',
    ]);
  });

  it('deshace la creación si la transacción falla después', async () => {
    const correo = correoUnico();

    await expect(
      transaccion(async ({ consultar: consultarTx }) => {
        await crearAdministrador(
          { correo, nombreCompleto: 'Soporte', contrasena: 'Exaltacion-Obrajes-167' },
          { consultar: consultarTx },
        );
        throw new Error('falla posterior');
      }),
    ).rejects.toThrow('falla posterior');

    const { rows } = await consultar('SELECT 1 FROM usuario WHERE correo = $1', [correo]);
    expect(rows).toHaveLength(0);
  });
});
