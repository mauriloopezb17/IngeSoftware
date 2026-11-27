// Pruebas de integración tabuladas de filtros, orden y paginación en el portal (PAR-161.1).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const panel = crearPanel(app);
const PREFIJO = 'PAR161P';
let cookieAdmin;

const creados = {
  horarios: [],
  servicios: [],
  grupos: [],
  videos: [],
  publicaciones: [],
  eventos: [],
  proclamas: [],
  boletines: [],
  archivos: [],
};

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const login = await request(app)
    .post('/api/auth/login')
    .send({ correo: admin.correo, contrasena: admin.contrasena });
  expect(login.status).toBe(200);
  cookieAdmin = login.headers['set-cookie'][0].split(';')[0];

  const sede = await sedePrincipal();
  // Crear 2 archivos PDF en biblioteca para boletines
  for (const [idx, nombre] of [`${PREFIJO}-boletin-a.pdf`, `${PREFIJO}-boletin-b.pdf`].entries()) {
    const archivo = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: admin.id,
      tipoMime: 'application/pdf',
      nombreOriginal: nombre,
      clave: `sedes/${sede.slug}/2026/11/par161p-${idx}-${Date.now()}.pdf`,
    });
    creados.archivos.push(archivo.id);
  }

  // Horarios (2 activos, distintos tipos y horas)
  for (const h of [
    {
      sedeId: sede.id,
      tipoHorarioId: 1,
      diaSemana: 1,
      horaInicio: '06:15',
      horaFin: '07:00',
      descripcion: `${PREFIJO} Misa A`,
      activo: true,
    },
    {
      sedeId: sede.id,
      tipoHorarioId: 2,
      diaSemana: 3,
      horaInicio: '19:45',
      horaFin: '20:30',
      descripcion: `${PREFIJO} Confesión B`,
      activo: true,
    },
  ]) {
    const res = await request(app).post('/api/admin/horarios').set('Cookie', cookieAdmin).send(h);
    expect(res.status).toBe(201);
    creados.horarios.push(res.body.datos.id);
  }

  // Servicios (2 visibles)
  for (const s of [
    {
      sedeId: sede.id,
      nombre: `${PREFIJO} A Servicio`,
      descripcionCorta: 'Servicio prueba A',
      visible: true,
    },
    {
      sedeId: sede.id,
      nombre: `${PREFIJO} Z Servicio`,
      descripcionCorta: 'Servicio prueba Z',
      visible: true,
    },
  ]) {
    const res = await request(app).post('/api/admin/servicios').set('Cookie', cookieAdmin).send(s);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.servicios.push(res.body.datos.id);
  }

  // Grupos pastorales (2 visibles)
  for (const g of [
    { sedeId: sede.id, nombre: `${PREFIJO} A Grupo`, descripcion: 'Grupo prueba A', visible: true },
    { sedeId: sede.id, nombre: `${PREFIJO} Z Grupo`, descripcion: 'Grupo prueba Z', visible: true },
  ]) {
    const res = await request(app)
      .post('/api/admin/grupos-pastorales')
      .set('Cookie', cookieAdmin)
      .send(g);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.grupos.push(res.body.datos.id);
  }

  // Videos (2, uno destacado y otro no)
  for (const v of [
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} A Video`,
      youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      destacado: true,
    },
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} Z Video`,
      youtube: 'https://www.youtube.com/watch?v=pX7aQm3kR2c',
      destacado: false,
    },
  ]) {
    const res = await request(app).post('/api/admin/videos').set('Cookie', cookieAdmin).send(v);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.videos.push(res.body.datos.id);
  }

  // Publicaciones publicadas (2 noticias)
  for (const p of [
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} A Noticia`,
      tipo: 'NOTICIA',
      categoriaId: 1,
      resumen: 'Resumen A',
      contenido: {
        formato: 'blocknote',
        version: 1,
        bloques: [
          {
            id: 'b1',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Contenido A', styles: {} }],
            children: [],
          },
        ],
      },
    },
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} Z Noticia`,
      tipo: 'NOTICIA',
      categoriaId: 1,
      resumen: 'Resumen Z',
      contenido: {
        formato: 'blocknote',
        version: 1,
        bloques: [
          {
            id: 'b1',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Contenido Z', styles: {} }],
            children: [],
          },
        ],
      },
    },
  ]) {
    const res = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', cookieAdmin)
      .send(p);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const idPub = res.body.datos.id;
    creados.publicaciones.push(idPub);
    const rev = await request(app)
      .post(`/api/admin/publicaciones/${idPub}/enviar-revision`)
      .set('Cookie', cookieAdmin);
    expect(rev.status, JSON.stringify(rev.body)).toBe(200);
    const apr = await request(app)
      .post(`/api/admin/publicaciones/${idPub}/aprobar`)
      .set('Cookie', cookieAdmin)
      .send({});
    expect(apr.status, JSON.stringify(apr.body)).toBe(200);
  }

  // Eventos publicados (2 futuros en distinta fecha)
  for (const e of [
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} Evento 1`,
      categoriaEventoId: 1,
      estado: 'PUBLICADO',
      fechaInicio: '2031-05-10T10:00:00-04:00',
      fechaFin: '2031-05-10T12:00:00-04:00',
    },
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} Evento 2`,
      categoriaEventoId: 1,
      estado: 'PUBLICADO',
      fechaInicio: '2031-06-15T10:00:00-04:00',
      fechaFin: '2031-06-15T12:00:00-04:00',
    },
  ]) {
    const res = await request(app).post('/api/admin/eventos').set('Cookie', cookieAdmin).send(e);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.eventos.push(res.body.datos.id);
  }

  // Proclamas vigentes (2 en 2031 con publicación ya emitida) e historial (2 en 2021)
  for (const pr of [
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Juan A`,
      contrayente2: `${PREFIJO} Maria A`,
      fechaMatrimonio: '2031-07-10T11:00:00-04:00',
      publicaciones: [{ fecha: '2025-01-10' }],
    },
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Pedro B`,
      contrayente2: `${PREFIJO} Lucia B`,
      fechaMatrimonio: '2031-08-12T11:00:00-04:00',
      publicaciones: [{ fecha: '2025-01-15' }],
    },
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Pasado A`,
      contrayente2: `${PREFIJO} Pasada A`,
      fechaMatrimonio: '2021-03-10T11:00:00-04:00',
      publicaciones: [{ fecha: '2021-02-20' }],
    },
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Pasado B`,
      contrayente2: `${PREFIJO} Pasada B`,
      fechaMatrimonio: '2021-09-10T11:00:00-04:00',
      publicaciones: [{ fecha: '2021-08-20' }],
    },
  ]) {
    const res = await request(app).post('/api/admin/proclamas').set('Cookie', cookieAdmin).send(pr);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.proclamas.push(res.body.datos.id);
  }

  // Boletines (2 en 2029)
  for (const [idx, periodo] of ['2029-01', '2029-02'].entries()) {
    const res = await request(app)
      .post('/api/admin/boletines')
      .set('Cookie', cookieAdmin)
      .send({
        sedeId: sede.id,
        titulo: `${PREFIJO} Boletin ${idx + 1}`,
        periodo,
        archivoId: creados.archivos[idx],
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.boletines.push(res.body.datos.id);
  }
});

afterAll(async () => {
  for (const id of creados.boletines) {
    await request(app).delete(`/api/admin/boletines/${id}`).set('Cookie', cookieAdmin);
  }
  for (const id of creados.proclamas) {
    await request(app).delete(`/api/admin/proclamas/${id}`).set('Cookie', cookieAdmin);
  }
  for (const id of creados.eventos) {
    await request(app).delete(`/api/admin/eventos/${id}`).set('Cookie', cookieAdmin);
  }
  if (creados.publicaciones.length > 0) {
    await consultar('DELETE FROM publicacion WHERE id = ANY($1::int[])', [creados.publicaciones]);
  }
  for (const id of creados.videos) {
    await request(app).delete(`/api/admin/videos/${id}`).set('Cookie', cookieAdmin);
  }
  for (const id of creados.grupos) {
    await request(app).delete(`/api/admin/grupos-pastorales/${id}`).set('Cookie', cookieAdmin);
  }
  for (const id of creados.servicios) {
    await request(app).delete(`/api/admin/servicios/${id}`).set('Cookie', cookieAdmin);
  }
  for (const id of creados.horarios) {
    await request(app).delete(`/api/admin/horarios/${id}`).set('Cookie', cookieAdmin);
  }
  if (creados.archivos.length > 0) {
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1::int[])', [creados.archivos]);
  }
  // Limpiar bitácora de prueba generada por las operaciones
  await consultar(
    'DELETE FROM bitacora_cambio WHERE datos_nuevos::text LIKE $1 OR datos_anteriores::text LIKE $1',
    [`%${PREFIJO}%`],
  );
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

const CASOS_PORTAL = [
  {
    nombre: 'horarios',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/horarios`,
    filtro: 'tipo=1',
    ordenAsc: null,
    ordenDesc: null,
    buscar: null,
  },
  {
    nombre: 'servicios',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/servicios`,
    filtro: `buscar=${PREFIJO}`,
    ordenAsc: 'nombre',
    ordenDesc: '-nombre',
    buscar: PREFIJO,
  },
  {
    nombre: 'grupos-pastorales',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales`,
    filtro: `buscar=${PREFIJO}`,
    ordenAsc: 'nombre',
    ordenDesc: '-nombre',
    buscar: PREFIJO,
  },
  {
    nombre: 'videos',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/videos`,
    filtro: 'destacado=true',
    ordenAsc: 'titulo',
    ordenDesc: '-titulo',
    buscar: PREFIJO,
  },
  {
    nombre: 'publicaciones',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/publicaciones`,
    filtro: 'tipo=NOTICIA',
    ordenAsc: 'fechaPublicacion',
    ordenDesc: '-fechaPublicacion',
    buscar: PREFIJO,
  },
  {
    nombre: 'eventos',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/eventos`,
    filtro: 'categoria=1',
    ordenAsc: 'fechaInicio',
    ordenDesc: '-fechaInicio',
    buscar: null,
  },
  {
    nombre: 'proclamas vigentes',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/proclamas`,
    filtro: 'anio=2031',
    ordenAsc: null,
    ordenDesc: null,
    buscar: null,
  },
  {
    nombre: 'proclamas historial',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/proclamas/historial`,
    filtro: 'anio=2021',
    ordenAsc: null,
    ordenDesc: null,
    buscar: null,
  },
  {
    nombre: 'boletines',
    ruta: `/api/sedes/${SEDE_PRINCIPAL}/boletines`,
    filtro: 'anio=2029',
    ordenAsc: null,
    ordenDesc: null,
    buscar: null,
  },
];

describe('Listados públicos: total, página 2, filtros, orden y página fuera de rango (PAR-161.1)', () => {
  it.each(CASOS_PORTAL)(
    '$nombre cumple paginación, filtro, orden y página fuera de rango',
    async ({ ruta, filtro, ordenAsc, ordenDesc, buscar }) => {
      const p1 = await request(app).get(`${ruta}?pagina=1&porPagina=1`);
      expect(p1.status).toBe(200);
      expect(p1.body.datos).toHaveLength(1);
      expect(p1.body.paginacion.total).toBeGreaterThanOrEqual(2);
      expect(p1.body.paginacion.totalPaginas).toBe(p1.body.paginacion.total);

      const p2 = await request(app).get(`${ruta}?pagina=2&porPagina=1`);
      expect(p2.status).toBe(200);
      expect(p2.body.datos).toHaveLength(1);
      expect(p2.body.paginacion.pagina).toBe(2);
      expect(p2.body.datos[0]).not.toEqual(p1.body.datos[0]);

      const filtrado = await request(app).get(`${ruta}?${filtro}&pagina=1&porPagina=50`);
      expect(filtrado.status).toBe(200);
      expect(filtrado.body.paginacion.total).toBeGreaterThanOrEqual(1);

      if (buscar) {
        const conMatch = await request(app).get(`${ruta}?buscar=${buscar}`);
        expect(conMatch.status).toBe(200);
        expect(conMatch.body.paginacion.total).toBeGreaterThanOrEqual(1);

        const sinMatch = await request(app).get(`${ruta}?buscar=ZZZ_INEXISTENTE_161`);
        expect(sinMatch.status).toBe(200);
        expect(sinMatch.body.paginacion.total).toBe(0);
        expect(sinMatch.body.datos).toEqual([]);
      }

      if (ordenAsc && ordenDesc) {
        const asc = await request(app).get(`${ruta}?orden=${ordenAsc}&pagina=1&porPagina=1`);
        const desc = await request(app).get(`${ruta}?orden=${ordenDesc}&pagina=1&porPagina=1`);
        expect(asc.status).toBe(200);
        expect(desc.status).toBe(200);
        expect(asc.body.datos[0]).not.toEqual(desc.body.datos[0]);
      }

      const fuera = await request(app).get(`${ruta}?pagina=9999&porPagina=2`);
      expect(fuera.status).toBe(200);
      expect(fuera.body.datos).toEqual([]);
      expect(fuera.body.paginacion.total).toBe(p1.body.paginacion.total);
    },
  );
});
