// Pruebas de integración tabuladas de filtros, orden y paginación en el panel admin (PAR-161.1).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { emitirTokenObservacion } from '../../src/services/observacionesProclama.service.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { crearPanel, sedePrincipal } from '../apoyo/panel.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const panel = crearPanel(app);
const PREFIJO = 'PAR161A';
let cookieAdmin;
let cookieParroco;

const creados = {
  horarios: [],
  servicios: [],
  grupos: [],
  videos: [],
  publicaciones: [],
  eventos: [],
  proclamas: [],
  boletines: [],
  paginas: [],
  sedes: [],
  archivos: [],
  observaciones: [],
};

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  const admin = await crearUsuarioDePrueba({
    rol: 'ADMINISTRADOR',
    sede: null,
    nombreCompleto: `${PREFIJO} Admin A`,
  });
  const parroco = await crearUsuarioDePrueba({
    rol: 'PARROCO',
    nombreCompleto: `${PREFIJO} Parroco Z`,
  });
  const m1 = await crearUsuarioDePrueba({ rol: 'MARKETING' });
  const m2 = await crearUsuarioDePrueba({ rol: 'MARKETING' });

  const loginAdmin = await request(app)
    .post('/api/auth/login')
    .send({ correo: admin.correo, contrasena: admin.contrasena });
  expect(loginAdmin.status).toBe(200);
  cookieAdmin = loginAdmin.headers['set-cookie'][0].split(';')[0];

  await request(app)
    .patch(`/api/admin/usuarios/${m1.id}`)
    .set('Cookie', cookieAdmin)
    .send({ nombreCompleto: `${PREFIJO} Marketing 1` });
  await request(app)
    .patch(`/api/admin/usuarios/${m2.id}`)
    .set('Cookie', cookieAdmin)
    .send({ nombreCompleto: `${PREFIJO} Marketing 2` });

  const loginParroco = await request(app)
    .post('/api/auth/login')
    .send({ correo: parroco.correo, contrasena: parroco.contrasena });
  expect(loginParroco.status).toBe(200);
  cookieParroco = loginParroco.headers['set-cookie'][0].split(';')[0];

  const sede = await sedePrincipal();

  // Archivos multimedia (2 documentos con texto alternativo para búsqueda)
  for (const [idx] of [1, 2].entries()) {
    const archivo = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: admin.id,
      tipoMime: 'application/pdf',
      clave: `sedes/${sede.slug}/2026/11/${PREFIJO}-${idx}-${Date.now()}.pdf`,
      textoAlternativo: `${PREFIJO} documento ${idx + 1}`,
    });
    creados.archivos.push(archivo.id);
  }

  // Horarios
  for (const h of [
    {
      sedeId: sede.id,
      tipoHorarioId: 1,
      diaSemana: 2,
      horaInicio: '06:20',
      horaFin: '07:00',
      descripcion: `${PREFIJO} Misa A`,
      activo: true,
    },
    {
      sedeId: sede.id,
      tipoHorarioId: 2,
      diaSemana: 4,
      horaInicio: '19:50',
      horaFin: '20:30',
      descripcion: `${PREFIJO} Confesion B`,
      activo: true,
    },
  ]) {
    const res = await request(app).post('/api/admin/horarios').set('Cookie', cookieAdmin).send(h);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.horarios.push(res.body.datos.id);
  }

  // Servicios
  for (const s of [
    { sedeId: sede.id, nombre: `${PREFIJO} A Servicio`, descripcionCorta: 'Desc A', visible: true },
    { sedeId: sede.id, nombre: `${PREFIJO} Z Servicio`, descripcionCorta: 'Desc Z', visible: true },
  ]) {
    const res = await request(app).post('/api/admin/servicios').set('Cookie', cookieAdmin).send(s);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.servicios.push(res.body.datos.id);
  }

  // Grupos pastorales
  for (const g of [
    { sedeId: sede.id, nombre: `${PREFIJO} A Grupo`, descripcion: 'Desc A', visible: true },
    { sedeId: sede.id, nombre: `${PREFIJO} Z Grupo`, descripcion: 'Desc Z', visible: true },
  ]) {
    const res = await request(app)
      .post('/api/admin/grupos-pastorales')
      .set('Cookie', cookieAdmin)
      .send(g);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.grupos.push(res.body.datos.id);
  }

  // Videos
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

  // Publicaciones
  for (const p of [
    {
      sedeId: sede.id,
      titulo: `${PREFIJO} A Publicacion`,
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
      titulo: `${PREFIJO} Z Publicacion`,
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
    creados.publicaciones.push(res.body.datos.id);
  }

  // Eventos
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

  // Proclamas + observaciones
  for (const pr of [
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Carlos A`,
      contrayente2: `${PREFIJO} Elena A`,
      fechaMatrimonio: '2031-07-10T11:00:00-04:00',
      publicaciones: [{ fecha: '2025-01-10' }],
    },
    {
      sedeId: sede.id,
      contrayente1: `${PREFIJO} Mateo B`,
      contrayente2: `${PREFIJO} Sofia B`,
      fechaMatrimonio: '2031-08-12T11:00:00-04:00',
      publicaciones: [{ fecha: '2025-01-15' }],
    },
  ]) {
    const res = await request(app).post('/api/admin/proclamas').set('Cookie', cookieAdmin).send(pr);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.proclamas.push(res.body.datos.id);
  }

  // 2 observaciones sobre la primera proclama
  for (const [idx, nombreCompleto] of [`${PREFIJO} Obs 1`, `${PREFIJO} Obs 2`].entries()) {
    const resObs = await request(app)
      .post(`/api/sedes/${sede.slug}/proclamas/${creados.proclamas[0]}/observaciones`)
      .send({
        nombreCompleto,
        correo: `obs${idx}@ejemplo.test`,
        mensaje: `Observación de prueba ${PREFIJO} ${idx + 1}`,
        verificacion: emitirTokenObservacion(creados.proclamas[0], { ahora: Date.now() - 5000 }),
      });
    expect(resObs.status, JSON.stringify(resObs.body)).toBe(201);
    creados.observaciones.push(resObs.body.datos.id);
  }

  // Boletines
  for (const [idx, periodo] of ['2029-03', '2029-04'].entries()) {
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

  // Páginas
  for (const [idx, titulo] of [`${PREFIJO} A Pagina`, `${PREFIJO} Z Pagina`].entries()) {
    const res = await request(app)
      .post('/api/admin/paginas')
      .set('Cookie', cookieAdmin)
      .send({
        sedeId: sede.id,
        titulo,
        slug: `par161a-pagina-${idx + 1}`,
        estado: 'PUBLICADO',
        mostrarEnMenu: false,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.paginas.push(res.body.datos.id);
  }

  // Sedes (capillas de prueba)
  for (const [idx, nombre] of [`${PREFIJO} A Sede`, `${PREFIJO} Z Sede`].entries()) {
    const res = await request(app)
      .post('/api/admin/sedes')
      .set('Cookie', cookieAdmin)
      .send({
        nombre,
        slug: `par161a-sede-${idx + 1}`,
        tipo: 'CAPILLA',
        sedePadreId: sede.id,
        activo: true,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    creados.sedes.push(res.body.datos.id);
  }
});

afterAll(async () => {
  if (creados.observaciones.length > 0) {
    await consultar('DELETE FROM observacion_proclama WHERE id = ANY($1::int[])', [
      creados.observaciones,
    ]);
  }
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
  for (const id of creados.paginas) {
    await request(app).delete(`/api/admin/paginas/${id}`).set('Cookie', cookieAdmin);
  }
  if (creados.sedes.length > 0) {
    await consultar('DELETE FROM sede WHERE id = ANY($1::int[])', [creados.sedes]);
  }
  if (creados.archivos.length > 0) {
    await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1::int[])', [creados.archivos]);
  }
  await consultar(
    'DELETE FROM bitacora_cambio WHERE datos_nuevos::text LIKE $1 OR datos_anteriores::text LIKE $1',
    [`%${PREFIJO}%`],
  );
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

const CASOS_ADMIN = [
  {
    nombre: 'publicaciones',
    ruta: '/api/admin/publicaciones',
    filtro: 'tipo=NOTICIA',
    ordenAsc: 'titulo',
    ordenDesc: '-titulo',
    buscar: PREFIJO,
  },
  {
    nombre: 'eventos',
    ruta: '/api/admin/eventos',
    filtro: 'estado=PUBLICADO',
    ordenAsc: 'fechaInicio',
    ordenDesc: '-fechaInicio',
    buscar: null,
  },
  {
    nombre: 'proclamas',
    ruta: '/api/admin/proclamas',
    filtro: 'vigentes=true',
    ordenAsc: 'fechaMatrimonio',
    ordenDesc: '-fechaMatrimonio',
    buscar: PREFIJO,
  },
  {
    nombre: 'proclamas/observaciones',
    ruta: '/api/admin/proclamas/observaciones',
    filtro: 'estado=todas',
    ordenAsc: 'fechaEnvio',
    ordenDesc: '-fechaEnvio',
    buscar: PREFIJO,
    parroco: true,
  },
  {
    nombre: 'boletines',
    ruta: '/api/admin/boletines',
    filtro: 'anio=2029',
    ordenAsc: 'periodo',
    ordenDesc: '-periodo',
    buscar: PREFIJO,
  },
  {
    nombre: 'multimedia',
    ruta: '/api/admin/multimedia',
    filtro: 'clase=DOCUMENTO',
    ordenAsc: 'tamanoBytes',
    ordenDesc: '-tamanoBytes',
    buscar: PREFIJO,
  },
  {
    nombre: 'usuarios',
    ruta: '/api/admin/usuarios',
    filtro: 'rol=MARKETING',
    ordenAsc: 'nombreCompleto',
    ordenDesc: '-nombreCompleto',
    buscar: PREFIJO,
  },
  {
    nombre: 'bitacora',
    ruta: '/api/admin/bitacora',
    filtro: 'accion=INSERT',
    ordenAsc: null,
    ordenDesc: null,
    buscar: null,
  },
  {
    nombre: 'horarios',
    ruta: '/api/admin/horarios',
    filtro: 'tipo=1',
    ordenAsc: 'horaInicio',
    ordenDesc: '-horaInicio',
    buscar: PREFIJO,
  },
  {
    nombre: 'servicios',
    ruta: '/api/admin/servicios',
    filtro: 'visible=true',
    ordenAsc: 'nombre',
    ordenDesc: '-nombre',
    buscar: PREFIJO,
  },
  {
    nombre: 'grupos-pastorales',
    ruta: '/api/admin/grupos-pastorales',
    filtro: 'visible=true',
    ordenAsc: 'nombre',
    ordenDesc: '-nombre',
    buscar: PREFIJO,
  },
  {
    nombre: 'videos',
    ruta: '/api/admin/videos',
    filtro: 'destacado=true',
    ordenAsc: 'titulo',
    ordenDesc: '-titulo',
    buscar: PREFIJO,
  },
  {
    nombre: 'paginas',
    ruta: '/api/admin/paginas',
    filtro: 'estado=PUBLICADO',
    ordenAsc: 'titulo',
    ordenDesc: '-titulo',
    buscar: PREFIJO,
  },
  {
    nombre: 'sedes',
    ruta: '/api/admin/sedes',
    filtro: 'tipo=CAPILLA',
    ordenAsc: 'nombre',
    ordenDesc: '-nombre',
    buscar: PREFIJO,
  },
];

describe('Listados del panel: total, página 2, filtros, orden y página fuera de rango (PAR-161.1)', () => {
  it.each(CASOS_ADMIN)(
    '$nombre cumple paginación, filtro, orden y página fuera de rango',
    async ({ ruta, filtro, ordenAsc, ordenDesc, buscar, parroco }) => {
      const cookie = parroco ? cookieParroco : cookieAdmin;

      const p1 = await request(app).get(`${ruta}?pagina=1&porPagina=1`).set('Cookie', cookie);
      expect(p1.status).toBe(200);
      expect(p1.body.datos).toHaveLength(1);
      expect(p1.body.paginacion.total).toBeGreaterThanOrEqual(2);
      expect(p1.body.paginacion.totalPaginas).toBe(p1.body.paginacion.total);

      const p2 = await request(app).get(`${ruta}?pagina=2&porPagina=1`).set('Cookie', cookie);
      expect(p2.status).toBe(200);
      expect(p2.body.datos).toHaveLength(1);
      expect(p2.body.paginacion.pagina).toBe(2);
      expect(p2.body.datos[0].id).not.toBe(p1.body.datos[0].id);

      const filtrado = await request(app)
        .get(`${ruta}?${filtro}&pagina=1&porPagina=50`)
        .set('Cookie', cookie);
      expect(filtrado.status).toBe(200);
      expect(filtrado.body.paginacion.total).toBeGreaterThanOrEqual(1);

      if (buscar) {
        const conMatch = await request(app).get(`${ruta}?buscar=${buscar}`).set('Cookie', cookie);
        expect(conMatch.status).toBe(200);
        expect(conMatch.body.paginacion.total).toBeGreaterThanOrEqual(1);

        const sinMatch = await request(app)
          .get(`${ruta}?buscar=ZZZ_INEXISTENTE_161`)
          .set('Cookie', cookie);
        expect(sinMatch.status).toBe(200);
        expect(sinMatch.body.paginacion.total).toBe(0);
        expect(sinMatch.body.datos).toEqual([]);
      }

      if (ordenAsc && ordenDesc) {
        const asc = await request(app)
          .get(`${ruta}?orden=${ordenAsc}&pagina=1&porPagina=1`)
          .set('Cookie', cookie);
        const desc = await request(app)
          .get(`${ruta}?orden=${ordenDesc}&pagina=1&porPagina=1`)
          .set('Cookie', cookie);
        expect(asc.status).toBe(200);
        expect(desc.status).toBe(200);
        expect(asc.body.datos[0].id).not.toBe(desc.body.datos[0].id);
      }

      const fuera = await request(app).get(`${ruta}?pagina=9999&porPagina=2`).set('Cookie', cookie);
      expect(fuera.status).toBe(200);
      expect(fuera.body.datos).toEqual([]);
      expect(fuera.body.paginacion.total).toBe(p1.body.paginacion.total);
    },
  );
});
