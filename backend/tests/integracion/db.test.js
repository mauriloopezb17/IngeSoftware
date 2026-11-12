// Pruebas de integración contra el PostgreSQL de DATABASE_URL (el del CI o el de docker-compose),
// con el esquema, las migraciones y el seed ya cargados. No modifican los datos del seed.
import { randomUUID } from 'node:crypto';
import { afterAll, describe, it, expect } from 'vitest';
import { cerrarPool, consultar, transaccion, verificarConexion } from '../../src/db/index.js';

// Nombre único para las tablas de prueba de las transacciones.
const nombreTabla = () => `prueba_api_${randomUUID().replaceAll('-', '')}`;

async function existeTabla(nombre) {
  const { rows } = await consultar('SELECT to_regclass($1) IS NOT NULL AS existe', [nombre]);
  return rows[0].existe;
}

afterAll(async () => {
  await cerrarPool();
});

describe('conexión y consultas', () => {
  it('verifica la conexión con PostgreSQL', async () => {
    await expect(verificarConexion()).resolves.toBeUndefined();
  });

  it('ejecuta consultas parametrizadas y conserva los caracteres en UTF-8', async () => {
    const { rows, rowCount } = await consultar('SELECT $1::text AS texto, $2::int + 1 AS numero', [
      'Señor de la Exaltación',
      41,
    ]);

    expect(rowCount).toBe(1);
    expect(rows[0]).toEqual({ texto: 'Señor de la Exaltación', numero: 42 });
  });

  it('devuelve date como texto YYYY-MM-DD, bigint como número y timestamptz como Date', async () => {
    const { rows } = await consultar(
      "SELECT DATE '2026-11-01' AS fecha, 2516582::bigint AS grande, TIMESTAMPTZ '2026-11-14 11:00-04' AS momento",
    );

    expect(rows[0].fecha).toBe('2026-11-01');
    expect(rows[0].grande).toBe(2516582);
    expect(rows[0].momento).toBeInstanceOf(Date);
    expect(rows[0].momento.toISOString()).toBe('2026-11-14T15:00:00.000Z');
  });

  it('propaga los errores de SQL con su código de PostgreSQL', async () => {
    await expect(consultar('SELECT * FROM tabla_que_no_existe')).rejects.toMatchObject({
      code: '42P01',
    });
  });
});

describe('transacciones', () => {
  it('confirma los cambios y devuelve el valor de la función', async () => {
    const tabla = nombreTabla();

    try {
      const valor = await transaccion(async ({ consultar: consultarEnTx }) => {
        await consultarEnTx(`CREATE TABLE ${tabla} (n int)`);
        await consultarEnTx(`INSERT INTO ${tabla} VALUES (1), (2)`);
        const { rows } = await consultarEnTx(`SELECT count(*)::int AS total FROM ${tabla}`);
        return rows[0].total;
      });

      expect(valor).toBe(2);
      expect(await existeTabla(tabla)).toBe(true);
    } finally {
      await consultar(`DROP TABLE IF EXISTS ${tabla}`);
    }
  });

  it('deshace los cambios y relanza el error si la función falla', async () => {
    const tabla = nombreTabla();
    const error = new Error('falla a propósito');

    await expect(
      transaccion(async ({ consultar: consultarEnTx }) => {
        await consultarEnTx(`CREATE TABLE ${tabla} (n int)`);
        throw error;
      }),
    ).rejects.toBe(error);

    expect(await existeTabla(tabla)).toBe(false);
  });

  it('deshace los cambios si falla una consulta dentro de la transacción', async () => {
    const tabla = nombreTabla();

    await expect(
      transaccion(async ({ consultar: consultarEnTx }) => {
        await consultarEnTx(`CREATE TABLE ${tabla} (n int)`);
        await consultarEnTx(`INSERT INTO ${tabla} VALUES ('no es un número')`);
      }),
    ).rejects.toMatchObject({ code: '22P02' });

    expect(await existeTabla(tabla)).toBe(false);
  });
});

describe('esquema y seed que usa el contrato de la API', () => {
  it('tiene los cuatro estados de publicación con sus ids', async () => {
    const { rows } = await consultar('SELECT id, nombre FROM estado_publicacion ORDER BY id');

    expect(rows).toEqual([
      { id: 1, nombre: 'Borrador' },
      { id: 2, nombre: 'Publicado' },
      { id: 3, nombre: 'Archivado' },
      { id: 4, nombre: 'En revisión' },
    ]);
  });

  it('tiene los campos de revisión en publicacion (migración 001)', async () => {
    const { rows } = await consultar(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'publicacion' AND column_name = ANY($1) ORDER BY column_name`,
      [['fecha_revision', 'observacion_revision', 'revisado_por']],
    );

    expect(rows.map((fila) => fila.column_name)).toEqual([
      'fecha_revision',
      'observacion_revision',
      'revisado_por',
    ]);
  });

  it('permite proclamas sin trámite de origen (migración 002)', async () => {
    const { rows } = await consultar(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_name = 'proclama' AND column_name = 'tramite_origen_id'`,
    );

    expect(rows[0].is_nullable).toBe('YES');
  });

  it('tiene un usuario de desarrollo por rol', async () => {
    const { rows } = await consultar(
      'SELECT r.nombre AS rol, u.correo FROM usuario u JOIN rol r ON r.id = u.rol_id ORDER BY u.id',
    );

    expect(rows).toEqual([
      { rol: 'Administrador', correo: 'admin@parroquia.test' },
      { rol: 'Párroco', correo: 'parroco@parroquia.test' },
      { rol: 'Secretaría', correo: 'secretaria@parroquia.test' },
      { rol: 'Marketing', correo: 'marketing@parroquia.test' },
    ]);
  });

  it('tiene la sede principal con el slug que usan las rutas públicas', async () => {
    const { rows } = await consultar('SELECT id, nombre FROM sede WHERE slug = $1', [
      'senor-de-la-exaltacion',
    ]);

    expect(rows).toEqual([{ id: 1, nombre: 'Parroquia Señor de la Exaltación' }]);
  });
});
