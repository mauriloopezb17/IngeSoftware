import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { obtenerEntorno } from '../../src/config/entorno.js';
import { duracionEnSegundos, firmarToken, verificarToken } from '../../src/utils/sesion.js';

const secreto = () => obtenerEntorno().jwt.secreto;

describe('duracionEnSegundos', () => {
  it.each([
    ['30s', 30],
    ['30m', 1_800],
    ['8h', 28_800],
    ['1d', 86_400],
  ])('%s son %i segundos', (duracion, segundos) => {
    expect(duracionEnSegundos(duracion)).toBe(segundos);
  });
});

describe('firmarToken y verificarToken', () => {
  it('firma con HS256 y el contenido del contrato (sub como texto, rol, sede, iat y exp)', () => {
    const { token, duracionSegundos, expiraEn } = firmarToken({
      id: 3,
      rol: 'SECRETARIA',
      sede: 1,
    });

    const { header } = jwt.decode(token, { complete: true });
    expect(header.alg).toBe('HS256');

    const contenido = verificarToken(token);
    expect(contenido).toEqual({
      sub: '3',
      rol: 'SECRETARIA',
      sede: 1,
      iat: expect.any(Number),
      exp: expect.any(Number),
    });
    expect(contenido.exp - contenido.iat).toBe(duracionSegundos);
    expect(expiraEn.getTime()).toBe(contenido.exp * 1000);
  });

  it('guarda sede null para un Administrador sin sede', () => {
    const { token } = firmarToken({ id: 1, rol: 'ADMINISTRADOR', sede: null });

    expect(verificarToken(token)).toMatchObject({ sub: '1', rol: 'ADMINISTRADOR', sede: null });
  });

  it('rechaza un token vencido', () => {
    const vencido = jwt.sign({ rol: 'SECRETARIA', sede: 1 }, secreto(), {
      algorithm: 'HS256',
      subject: '3',
      expiresIn: -10,
    });

    expect(verificarToken(vencido)).toBeNull();
  });

  it('rechaza un token firmado con otro secreto', () => {
    const ajeno = jwt.sign({ rol: 'ADMINISTRADOR', sede: null }, `${secreto()}-otro`, {
      algorithm: 'HS256',
      subject: '1',
    });

    expect(verificarToken(ajeno)).toBeNull();
  });

  it('rechaza un token sin firma (alg none) y otro algoritmo', () => {
    const sinFirma = jwt.sign({ rol: 'ADMINISTRADOR' }, '', { algorithm: 'none', subject: '1' });
    const hs512 = jwt.sign({ rol: 'ADMINISTRADOR' }, secreto(), {
      algorithm: 'HS512',
      subject: '1',
    });

    expect(verificarToken(sinFirma)).toBeNull();
    expect(verificarToken(hs512)).toBeNull();
  });

  it('rechaza un token alterado o texto que no es un token', () => {
    const { token } = firmarToken({ id: 3, rol: 'SECRETARIA', sede: 1 });
    const [cabecera, , firma] = token.split('.');
    const otroContenido = Buffer.from(
      JSON.stringify({ sub: '1', rol: 'ADMINISTRADOR', sede: null }),
    ).toString('base64url');

    expect(verificarToken(`${cabecera}.${otroContenido}.${firma}`)).toBeNull();
    expect(verificarToken('no-es-un-token')).toBeNull();
    expect(verificarToken('')).toBeNull();
  });
});
