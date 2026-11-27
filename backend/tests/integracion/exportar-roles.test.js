// Pruebas de integración de exportación CSV contra la matriz de permisos del contrato (PAR-161.2).
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { ROLES } from '../../src/constantes/catalogos.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { BOM_UTF8 } from '../../src/utils/csv.js';
import { matrizDePermisosDelContrato } from '../apoyo/contrato.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const panel = crearPanel(app);
const PREFIJO = 'PAR161E';

const RUTAS_EXPORTAR = {
  'publicaciones.exportar': '/api/admin/publicaciones/exportar',
  'eventos.exportar': '/api/admin/eventos/exportar',
  'proclamas.exportar': '/api/admin/proclamas/exportar',
  'observaciones.exportar': '/api/admin/proclamas/observaciones/exportar',
  'boletines.exportar': '/api/admin/boletines/exportar',
  'multimedia.exportar': '/api/admin/multimedia/exportar',
  'usuarios.exportar': '/api/admin/usuarios/exportar',
  'bitacora.exportar': '/api/admin/bitacora/exportar',
  'horarios.exportar': '/api/admin/horarios/exportar',
  'servicios.exportar': '/api/admin/servicios/exportar',
  'grupos.exportar': '/api/admin/grupos-pastorales/exportar',
  'videos.exportar': '/api/admin/videos/exportar',
  'paginas.exportar': '/api/admin/paginas/exportar',
  'sedes.exportar': '/api/admin/sedes/exportar',
};

const matrizExportar = matrizDePermisosDelContrato().filter((fila) =>
  fila.permiso.endsWith('.exportar'),
);

const CASOS_MATRIZ = matrizExportar.flatMap(({ permiso, roles }) =>
  ROLES.codigos.map((rol) => ({
    permiso,
    ruta: RUTAS_EXPORTAR[permiso],
    rol,
    permitido: roles.includes(rol),
  })),
);

const sesiones = {};
const usuarios = [];
let sedeA;
let sedeBId;
const creados = {
  publicaciones: [],
  servicios: [],
  proclamas: [],
  observaciones: [],
};

async function iniciarSesion(usuario) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0];
}

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  sedeA = await sedePrincipal();

  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const parroco = await crearUsuarioDePrueba({ rol: 'PARROCO' });
  const secretaria = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
  const marketing = await crearUsuarioDePrueba({ rol: 'MARKETING' });
  usuarios.push(admin, parroco, secretaria, marketing);

  sesiones.ADMINISTRADOR = await iniciarSesion(admin);
  sesiones.PARROCO = await iniciarSesion(parroco);
  sesiones.SECRETARIA = await iniciarSesion(secretaria);
  sesiones.MARKETING = await iniciarSesion(marketing);

  // Crear segunda sede para comprobar aislamiento por sede al exportar
  const resSedeB = await request(app)
    .post('/api/admin/sedes')
    .set('Cookie', sesiones.ADMINISTRADOR)
    .send({
      nombre: `${PREFIJO} Capilla B`,
      slug: `par161e-capilla-b-${Date.now()}`,
      tipo: 'CAPILLA',
      sedePadreId: sedeA.id,
      activo: true,
    });
  expect(resSedeB.status, JSON.stringify(resSedeB.body)).toBe(201);
  sedeBId = resSedeB.body.datos.id;

  // Publicaciones con filtro y protección contra inyección de fórmulas (=)
  for (const [idx, titulo] of [`=SUM(1,1) ${PREFIJO}`, `${PREFIJO} Noticia Normal`].entries()) {
    const res = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.ADMINISTRADOR)
      .send({
        sedeId: idx === 0 ? sedeA.id : sedeBId,
        titulo,
        tipo: 'NOTICIA',
        categoriaId: 1,
        resumen: `Resumen ${PREFIJO}`,
        contenido: {
          formato: 'blocknote',
          version: 1,
          bloques: [
            {
              id: 'b1',
              type: 'paragraph',
              props: {},
              content: [{ type: 'text', text: 'Texto', styles: {} }],
              children: [],
            },
          ],
        },
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.publicaciones.push(res.body.datos.id);
  }

  // Servicios en sede A vs sede B
  for (const [idx, nombre] of [
    `${PREFIJO} Servicio Sede A`,
    `${PREFIJO} Servicio Sede B`,
  ].entries()) {
    const res = await request(app)
      .post('/api/admin/servicios')
      .set('Cookie', sesiones.ADMINISTRADOR)
      .send({
        sedeId: idx === 0 ? sedeA.id : sedeBId,
        nombre,
        descripcionCorta: 'Servicio prueba',
        visible: true,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.servicios.push(res.body.datos.id);
  }

  // Proclama con observación confidencial (la exportación de proclamas nunca debe incluirla)
  const resProc = await request(app)
    .post('/api/admin/proclamas')
    .set('Cookie', sesiones.ADMINISTRADOR)
    .send({
      sedeId: sedeA.id,
      contrayente1: `${PREFIJO} Novio`,
      contrayente2: `${PREFIJO} Novia`,
      fechaMatrimonio: '2031-09-10T11:00:00-04:00',
      publicaciones: [{ fecha: '2025-01-10' }],
    });
  expect(resProc.status, JSON.stringify(resProc.body)).toBe(201);
  creados.proclamas.push(resProc.body.datos.id);

  const resObs = await request(app)
    .post(`/api/sedes/${sedeA.slug}/proclamas/${creados.proclamas[0]}/observaciones`)
    .send({
      nombreCompleto: `${PREFIJO} Confidencial`,
      correo: 'secreto161@ejemplo.test',
      mensaje: `Mensaje confidencial ${PREFIJO}`,
    });
  expect(resObs.status, JSON.stringify(resObs.body)).toBe(201);
  creados.observaciones.push(resObs.body.datos.id);
});

beforeEach(async () => {
  await limpiarContadoresDeIntentos();
});

afterAll(async () => {
  if (creados.observaciones.length > 0) {
    await consultar('DELETE FROM observacion_proclama WHERE id = ANY($1::int[])', [
      creados.observaciones,
    ]);
  }
  for (const id of creados.proclamas) {
    await request(app).delete(`/api/admin/proclamas/${id}`).set('Cookie', sesiones.ADMINISTRADOR);
  }
  for (const id of creados.servicios) {
    await request(app).delete(`/api/admin/servicios/${id}`).set('Cookie', sesiones.ADMINISTRADOR);
  }
  if (creados.publicaciones.length > 0) {
    await consultar('DELETE FROM publicacion WHERE id = ANY($1::int[])', [creados.publicaciones]);
  }
  await consultar(
    'DELETE FROM bitacora_cambio WHERE datos_nuevos::text LIKE $1 OR datos_anteriores::text LIKE $1',
    [`%${PREFIJO}%`],
  );
  await consultar("DELETE FROM bitacora_cambio WHERE accion = 'EXPORT' AND entidad_id = '*'");
  if (sedeBId) {
    await consultar('DELETE FROM sede WHERE id = $1', [sedeBId]);
  }
  await panel.limpiar();
  await borrarUsuariosDePrueba(usuarios);
  await cerrarRedis();
  await cerrarPool();
});

describe('Matriz de exportación CSV por rol leída del contrato (PAR-161.2)', () => {
  it('cubre todos los permisos *.exportar declarados en docs/api/autenticacion.md §7', () => {
    expect(matrizExportar).toHaveLength(14);
    for (const { permiso } of matrizExportar) {
      expect(RUTAS_EXPORTAR[permiso]).toBeTruthy();
    }
  });

  it.each(CASOS_MATRIZ)(
    '$permiso ($ruta) para $rol -> permitido=$permitido',
    async ({ ruta, rol, permitido }) => {
      const res = await request(app).get(ruta).set('Cookie', sesiones[rol]);

      if (permitido) {
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text.startsWith(BOM_UTF8)).toBe(true);
        expect(res.text).toContain(';');
      } else {
        expect(res.status).toBe(403);
        expect(res.body.error.codigo).toBe('SIN_PERMISO');
      }
    },
  );
});

describe('Contenido, filtros, sede, fórmulas y vistas de exportación (PAR-161.2)', () => {
  it('respeta filtros activos, aísla por sede y protege contra inyección de fórmulas (=)', async () => {
    const res = await request(app)
      .get(`/api/admin/publicaciones/exportar?buscar=${encodeURIComponent(PREFIJO)}`)
      .set('Cookie', sesiones.SECRETARIA);

    expect(res.status).toBe(200);
    expect(res.text.startsWith(BOM_UTF8)).toBe(true);
    expect(res.text).toContain(`'=SUM(1,1) ${PREFIJO}`);
    expect(res.text).not.toContain(`${PREFIJO} Noticia Normal`);

    const resServicios = await request(app)
      .get(`/api/admin/servicios/exportar?buscar=${encodeURIComponent(PREFIJO)}`)
      .set('Cookie', sesiones.PARROCO);
    expect(resServicios.status).toBe(200);
    expect(resServicios.text).toContain(`${PREFIJO} Servicio Sede A`);
    expect(resServicios.text).not.toContain(`${PREFIJO} Servicio Sede B`);
  });

  it('las observaciones solo se exportan para el Párroco y nunca aparecen en proclamas/exportar', async () => {
    const resProclamas = await request(app)
      .get(`/api/admin/proclamas/exportar?buscar=${encodeURIComponent(PREFIJO)}`)
      .set('Cookie', sesiones.SECRETARIA);
    expect(resProclamas.status).toBe(200);
    expect(resProclamas.text).toContain(`${PREFIJO} Novio`);
    expect(resProclamas.text).not.toContain('secreto161@ejemplo.test');
    expect(resProclamas.text).not.toContain(`Mensaje confidencial ${PREFIJO}`);

    const resObsParroco = await request(app)
      .get(`/api/admin/proclamas/observaciones/exportar?buscar=${encodeURIComponent(PREFIJO)}`)
      .set('Cookie', sesiones.PARROCO);
    expect(resObsParroco.status).toBe(200);
    expect(resObsParroco.text).toContain('secreto161@ejemplo.test');

    for (const rolSinAcceso of ['ADMINISTRADOR', 'SECRETARIA', 'MARKETING']) {
      const resDenegado = await request(app)
        .get('/api/admin/proclamas/observaciones/exportar')
        .set('Cookie', sesiones[rolSinAcceso]);
      expect(resDenegado.status).toBe(403);
    }
  });

  it('eventos y proclamas exportan su vista predeterminada con finalizados/vigentes y rechazan el parámetro vista', async () => {
    const eventosOk = await request(app)
      .get('/api/admin/eventos/exportar?finalizados=false')
      .set('Cookie', sesiones.SECRETARIA);
    expect(eventosOk.status).toBe(200);
    expect(eventosOk.text.startsWith(BOM_UTF8)).toBe(true);

    const eventosVista = await request(app)
      .get('/api/admin/eventos/exportar?vista=proximos')
      .set('Cookie', sesiones.SECRETARIA);
    expect(eventosVista.status).toBe(400);
    expect(eventosVista.body.error.codigo).toBe('VALIDACION');

    const proclamasOk = await request(app)
      .get('/api/admin/proclamas/exportar?vigentes=true')
      .set('Cookie', sesiones.SECRETARIA);
    expect(proclamasOk.status).toBe(200);
    expect(proclamasOk.text.startsWith(BOM_UTF8)).toBe(true);

    const proclamasVista = await request(app)
      .get('/api/admin/proclamas/exportar?vista=vigentes')
      .set('Cookie', sesiones.SECRETARIA);
    expect(proclamasVista.status).toBe(400);
    expect(proclamasVista.body.error.codigo).toBe('VALIDACION');
  });
});
