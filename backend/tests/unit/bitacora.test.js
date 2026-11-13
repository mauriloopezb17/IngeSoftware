// registrarCambio sin base de datos: qué se guarda en cada acción (db simulado).
import { describe, expect, it } from 'vitest';
import {
  CONTEXTO_DEL_SISTEMA,
  contextoDe,
  registrarCambio,
} from '../../src/services/bitacora.service.js';

// db falso: guarda los parámetros del INSERT en bitacora_cambio.
function dbFalso() {
  const llamadas = [];
  return {
    llamadas,
    consultar: async (texto, parametros) => {
      llamadas.push({ texto, parametros });
      return { rows: [], rowCount: 1 };
    },
  };
}

// Parámetros del INSERT -> objeto legible.
const registro = ({ parametros }) => ({
  usuarioId: parametros[0],
  entidad: parametros[1],
  entidadId: parametros[2],
  accion: parametros[3],
  datosAnteriores: parametros[4] === null ? null : JSON.parse(parametros[4]),
  datosNuevos: parametros[5] === null ? null : JSON.parse(parametros[5]),
  direccionIp: parametros[6],
});

const contexto = { usuarioId: 7, ip: '190.129.24.18' };

describe('registrarCambio', () => {
  it('INSERT guarda la fila completa en datosNuevos, con las fechas en hora de Bolivia', async () => {
    const db = dbFalso();

    await registrarCambio(db, contexto, {
      entidad: 'archivo_multimedia',
      entidadId: 12,
      accion: 'INSERT',
      nuevo: { id: 12, sede_id: 1, fecha_subida: new Date('2026-11-12T22:02:11Z') },
    });

    expect(db.llamadas[0].texto).toMatch(/INSERT INTO bitacora_cambio/);
    expect(registro(db.llamadas[0])).toEqual({
      usuarioId: 7,
      entidad: 'archivo_multimedia',
      entidadId: '12',
      accion: 'INSERT',
      datosAnteriores: null,
      datosNuevos: { id: 12, sede_id: 1, fecha_subida: '2026-11-12T18:02:11-04:00' },
      direccionIp: '190.129.24.18',
    });
  });

  it('DELETE guarda la fila completa en datosAnteriores', async () => {
    const db = dbFalso();

    await registrarCambio(db, contexto, {
      entidad: 'archivo_multimedia',
      entidadId: '12',
      accion: 'DELETE',
      anterior: { id: 12, sede_id: 1 },
    });

    expect(registro(db.llamadas[0])).toMatchObject({
      datosAnteriores: { id: 12, sede_id: 1 },
      datosNuevos: null,
    });
  });

  it('UPDATE guarda solo las columnas que cambiaron', async () => {
    const db = dbFalso();

    await registrarCambio(db, contexto, {
      entidad: 'archivo_multimedia',
      entidadId: 12,
      accion: 'UPDATE',
      anterior: { id: 12, texto_alternativo: 'antes', fecha_subida: new Date(0), extra: { a: 1 } },
      nuevo: { id: 12, texto_alternativo: 'después', fecha_subida: new Date(0), extra: { a: 1 } },
    });

    expect(registro(db.llamadas[0])).toMatchObject({
      datosAnteriores: { texto_alternativo: 'antes' },
      datosNuevos: { texto_alternativo: 'después' },
    });
  });

  it('un UPDATE que no cambia nada no se registra', async () => {
    const db = dbFalso();

    await registrarCambio(db, contexto, {
      entidad: 'archivo_multimedia',
      entidadId: 12,
      accion: 'UPDATE',
      anterior: { id: 12, texto_alternativo: 'igual' },
      nuevo: { id: 12, texto_alternativo: 'igual' },
    });

    expect(db.llamadas).toHaveLength(0);
  });

  it('el hash de la contraseña nunca se guarda: queda "[oculto]"', async () => {
    const db = dbFalso();

    await registrarCambio(db, contexto, {
      entidad: 'usuario',
      entidadId: 7,
      accion: 'UPDATE',
      anterior: { hash_contrasena: '$argon2id$v=19$viejo' },
      nuevo: { hash_contrasena: '$argon2id$v=19$nuevo' },
    });
    await registrarCambio(db, CONTEXTO_DEL_SISTEMA, {
      entidad: 'usuario',
      entidadId: 8,
      accion: 'INSERT',
      nuevo: { id: 8, correo: 'admin@parroquia.test', hash_contrasena: '$argon2id$v=19$x' },
    });

    expect(registro(db.llamadas[0])).toMatchObject({
      datosAnteriores: { hash_contrasena: '[oculto]' },
      datosNuevos: { hash_contrasena: '[oculto]' },
    });
    expect(registro(db.llamadas[1])).toMatchObject({
      usuarioId: null,
      direccionIp: null,
      datosNuevos: { id: 8, correo: 'admin@parroquia.test', hash_contrasena: '[oculto]' },
    });
    expect(JSON.stringify(db.llamadas)).not.toContain('$argon2');
  });

  it.each([
    ['::ffff:190.129.24.18', '190.129.24.18'],
    ['2800:cd0::1', '2800:cd0::1'],
    ['no-es-una-ip', null],
    [undefined, null],
  ])('la IP %s se guarda como %s', async (ip, esperada) => {
    const db = dbFalso();

    await registrarCambio(
      db,
      { usuarioId: 1, ip },
      {
        entidad: 'usuario',
        entidadId: 1,
        accion: 'DELETE',
        anterior: { id: 1 },
      },
    );

    expect(registro(db.llamadas[0]).direccionIp).toBe(esperada);
  });

  it('una acción desconocida es un error de programación', async () => {
    await expect(
      registrarCambio(dbFalso(), contexto, { entidad: 'x', entidadId: 1, accion: 'UPSERT' }),
    ).rejects.toThrow(TypeError);
  });
});

describe('contextoDe', () => {
  it('toma el usuario de la sesión y la IP de la petición', () => {
    expect(contextoDe({ usuario: { id: 3 }, ip: '10.0.0.1' })).toEqual({
      usuarioId: 3,
      ip: '10.0.0.1',
    });
    expect(contextoDe({})).toEqual({ usuarioId: null, ip: null });
  });
});
