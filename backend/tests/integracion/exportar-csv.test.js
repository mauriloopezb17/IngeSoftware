// Integración de exportación CSV (/api/admin/<recurso>/exportar) y permisos por rol (PAR-159).
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { ErrorApp } from '../../src/errores/ErrorApp.js';
import { exportarCsv } from '../../src/services/exportar.service.js';
import { BOM_UTF8, fechaActualBolivia } from '../../src/utils/csv.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();

const sesiones = {};
const usuarios = {};

async function iniciarSesion(usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

async function crearYSesion(clave, { rol, sedeSlug = 'senor-de-la-exaltacion' }) {
  const usuario = await crearUsuarioDePrueba({ rol, sedeSlug });
  usuarios[clave] = usuario;
  sesiones[clave] = await iniciarSesion(usuario);
}

beforeAll(async () => {
  await Promise.all([
    crearYSesion('admin', { rol: 'ADMINISTRADOR', sedeSlug: null }),
    crearYSesion('parroco', { rol: 'PARROCO' }),
    crearYSesion('secretaria', { rol: 'SECRETARIA' }),
    crearYSesion('marketing', { rol: 'MARKETING' }),
  ]);
});

beforeEach(async () => {
  await limpiarContadoresDeIntentos();
});

afterAll(async () => {
  await borrarUsuariosDePrueba(Object.values(usuarios));
  await cerrarRedis();
  await cerrarPool();
});

const RECURSOS_Y_PERMISOS = [
  {
    ruta: '/api/admin/publicaciones/exportar',
    archivo: 'publicaciones',
    entidad: 'publicacion',
    permitidos: ['admin', 'parroco', 'secretaria', 'marketing'],
    denegados: [],
  },
  {
    ruta: '/api/admin/eventos/exportar',
    archivo: 'eventos',
    entidad: 'evento',
    permitidos: ['admin', 'parroco', 'secretaria', 'marketing'],
    denegados: [],
  },
  {
    ruta: '/api/admin/boletines/exportar',
    archivo: 'boletines',
    entidad: 'boletin',
    permitidos: ['admin', 'parroco', 'secretaria', 'marketing'],
    denegados: [],
  },
  {
    ruta: '/api/admin/multimedia/exportar',
    archivo: 'multimedia',
    entidad: 'archivo_multimedia',
    permitidos: ['admin', 'parroco', 'secretaria', 'marketing'],
    denegados: [],
  },
  {
    ruta: '/api/admin/videos/exportar',
    archivo: 'videos',
    entidad: 'video',
    permitidos: ['admin', 'parroco', 'secretaria', 'marketing'],
    denegados: [],
  },
  {
    ruta: '/api/admin/proclamas/exportar',
    archivo: 'proclamas',
    entidad: 'proclama',
    permitidos: ['admin', 'parroco', 'secretaria'],
    denegados: ['marketing'],
  },
  {
    ruta: '/api/admin/horarios/exportar',
    archivo: 'horarios',
    entidad: 'horario',
    permitidos: ['admin', 'parroco', 'secretaria'],
    denegados: ['marketing'],
  },
  {
    ruta: '/api/admin/servicios/exportar',
    archivo: 'servicios',
    entidad: 'servicio',
    permitidos: ['admin', 'parroco', 'secretaria'],
    denegados: ['marketing'],
  },
  {
    ruta: '/api/admin/grupos-pastorales/exportar',
    archivo: 'grupos-pastorales',
    entidad: 'grupo_pastoral',
    permitidos: ['admin', 'parroco', 'secretaria'],
    denegados: ['marketing'],
  },
  {
    ruta: '/api/admin/paginas/exportar',
    archivo: 'paginas',
    entidad: 'pagina',
    permitidos: ['admin', 'parroco', 'secretaria'],
    denegados: ['marketing'],
  },
  {
    ruta: '/api/admin/proclamas/observaciones/exportar',
    archivo: 'observaciones-proclamas',
    entidad: 'observacion_proclama',
    permitidos: ['parroco'],
    denegados: ['admin', 'secretaria', 'marketing'],
  },
  {
    ruta: '/api/admin/usuarios/exportar',
    archivo: 'usuarios',
    entidad: 'usuario',
    permitidos: ['admin', 'parroco'],
    denegados: ['secretaria', 'marketing'],
  },
  {
    ruta: '/api/admin/sedes/exportar',
    archivo: 'sedes',
    entidad: 'sede',
    permitidos: ['admin', 'parroco'],
    denegados: ['secretaria', 'marketing'],
  },
  {
    ruta: '/api/admin/bitacora/exportar',
    archivo: 'bitacora',
    entidad: 'bitacora_cambio',
    permitidos: ['admin', 'parroco'],
    denegados: ['secretaria', 'marketing'],
  },
];

describe('Exportación CSV (/api/admin/<recurso>/exportar)', () => {
  it.each(RECURSOS_Y_PERMISOS)('sin sesión $ruta responde 401 NO_AUTENTICADO', async ({ ruta }) => {
    const res = await request(app).get(ruta);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
  });

  it.each(RECURSOS_Y_PERMISOS)(
    '$ruta permite exportar a roles autorizados con cabeceras CSV, BOM UTF-8 y bitácora EXPORT',
    async ({ ruta, archivo, entidad, permitidos }) => {
      const rolPrueba = permitidos[0];
      const res = await request(app).get(ruta).set('Cookie', sesiones[rolPrueba]);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/csv;\s*charset=utf-8/i);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['content-disposition']).toBe(
        `attachment; filename="${archivo}-${fechaActualBolivia()}.csv"`,
      );
      expect(res.text.startsWith(BOM_UTF8)).toBe(true);
      expect(res.text).toContain(';');
      expect(res.text).toContain('\r\n');

      const { rows } = await consultar(
        `SELECT accion, entidad, entidad_id, datos_nuevos
           FROM bitacora_cambio
          WHERE accion = 'EXPORT' AND entidad = $1
          ORDER BY id DESC
          LIMIT 1`,
        [entidad],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].entidad_id).toBe('*');
      expect(rows[0].datos_nuevos).toHaveProperty('filas');
      expect(rows[0].datos_nuevos).toHaveProperty('filtros');
    },
  );

  it.each(RECURSOS_Y_PERMISOS.filter((r) => r.denegados.length > 0))(
    '$ruta responde 403 SIN_PERMISO para roles no autorizados',
    async ({ ruta, denegados }) => {
      for (const rol of denegados) {
        const res = await request(app).get(ruta).set('Cookie', sesiones[rol]);
        expect(res.status).toBe(403);
        expect(res.body.error.codigo).toBe('SIN_PERMISO');
      }
    },
  );

  it('rechaza parámetros pagina y porPagina en /exportar con 400 VALIDACION', async () => {
    const res = await request(app)
      .get('/api/admin/publicaciones/exportar?pagina=2')
      .set('Cookie', sesiones.admin);

    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('impide a roles de sede exportar otra sede (403 SIN_PERMISO) y limita usuarios/sedes al párroco', async () => {
    const resOtraSede = await request(app)
      .get('/api/admin/publicaciones/exportar?sede=resurreccion')
      .set('Cookie', sesiones.parroco);
    expect(resOtraSede.status).toBe(403);
    expect(resOtraSede.body.error.codigo).toBe('SIN_PERMISO');

    const resUsuariosParroco = await request(app)
      .get('/api/admin/usuarios/exportar')
      .set('Cookie', sesiones.parroco);
    expect(resUsuariosParroco.status).toBe(200);
    expect(resUsuariosParroco.text).not.toContain('hash_contrasena');
    expect(resUsuariosParroco.text).not.toContain('Parroquia2026');
    expect(resUsuariosParroco.text).not.toContain('intentos_fallidos');

    const resSedesParroco = await request(app)
      .get('/api/admin/sedes/exportar')
      .set('Cookie', sesiones.parroco);
    expect(resSedesParroco.status).toBe(200);
    const lineasSedes = resSedesParroco.text.trim().split('\r\n');
    expect(lineasSedes).toHaveLength(2);
    expect(resSedesParroco.text).toContain('senor-de-la-exaltacion');
    expect(resSedesParroco.text).not.toContain('resurreccion');
  });

  it('el párroco puede listar usuarios en modo solo lectura pero no crear/editar/restablecer', async () => {
    const resListar = await request(app).get('/api/admin/usuarios').set('Cookie', sesiones.parroco);
    expect(resListar.status).toBe(200);
    expect(resListar.body.datos.length).toBeGreaterThan(0);

    const resCrear = await request(app)
      .post('/api/admin/usuarios')
      .set('Cookie', sesiones.parroco)
      .send({
        nombreCompleto: 'Prueba',
        correo: 'prueba-parroco@parroquia.test',
        rol: 'SECRETARIA',
        sedeId: 1,
        contrasena: 'ClaveSegura2026!',
      });
    expect(resCrear.status).toBe(403);
    expect(resCrear.body.error.codigo).toBe('SIN_PERMISO');
  });

  it('la exportación de proclamas nunca incluye observaciones confidenciales', async () => {
    const res = await request(app)
      .get('/api/admin/proclamas/exportar')
      .set('Cookie', sesiones.secretaria);
    expect(res.status).toBe(200);
    expect(res.text.split('\r\n')[0]).not.toMatch(/observaci[oó]n|mensaje|correo|tel[eé]fono/i);
  });

  it('responde 422 DEMASIADOS_REGISTROS cuando se supera el límite máximo de filas', async () => {
    await expect(
      exportarCsv('sedes', {
        usuario: { id: usuarios.admin.id, rol: 'ADMINISTRADOR', sedeId: null },
        sedeFiltro: undefined,
        consulta: { orden: 'nombre' },
        contexto: { usuarioId: usuarios.admin.id, ip: '127.0.0.1' },
        limiteMaximo: 1,
      }),
    ).rejects.toMatchObject({
      estado: 422,
      codigo: 'DEMASIADOS_REGISTROS',
    });

    const err = ErrorApp.demasiadosRegistros();
    expect(err.estado).toBe(422);
    expect(err.codigo).toBe('DEMASIADOS_REGISTROS');
  });

  it('permite filtrar la bitácora por accion=EXPORT', async () => {
    const res = await request(app)
      .get('/api/admin/bitacora?accion=EXPORT')
      .set('Cookie', sesiones.admin);
    expect(res.status).toBe(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
    expect(res.body.datos.every((c) => c.accion === 'EXPORT')).toBe(true);
  });
});
