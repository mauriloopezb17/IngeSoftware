// Pruebas de integración de noticias relacionadas con sacramentos y grupos (PAR-166.2).
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { cerrarPool, consultar } from '../../src/db/index.js';
import { cerrarRedis } from '../../src/db/redis.js';
import { reiniciarEstadoDeRedis } from '../../src/services/cache.service.js';
import { limpiarContadoresDeIntentos } from '../apoyo/limite.js';
import { SEDE_PRINCIPAL, borrarUsuariosDePrueba, crearUsuarioDePrueba } from '../apoyo/usuarios.js';

const app = createApp();
const prefijo = `nr-${randomUUID().slice(0, 6)}`;
const sesiones = {};
const publicacionesCreadas = [];
const serviciosCreados = [];
const gruposCreados = [];
let sedePrincipalId;
let otraSedeId;
let servicioId;
let servicioSlug;
let servicioOcultoId;
let servicioOcultoSlug;
let servicioAjenoId;
let grupoId;
let grupoSlug;
let grupoOcultoSlug;
let grupoAjenoId;

async function iniciarSesion(usuario) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  expect(res.status).toBe(200);
  return res.headers['set-cookie'][0].split(';')[0];
}

const contenidoMinimo = {
  formato: 'blocknote',
  version: 1,
  bloques: [
    {
      id: 'b1',
      type: 'paragraph',
      props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
      content: [{ type: 'text', text: 'Contenido de prueba.', styles: {} }],
      children: [],
    },
  ],
};

beforeAll(async () => {
  await limpiarContadoresDeIntentos();
  reiniciarEstadoDeRedis();

  const { rows: sedes } = await consultar('SELECT id, slug FROM sede ORDER BY id');
  sedePrincipalId = sedes.find((s) => s.slug === SEDE_PRINCIPAL).id;
  otraSedeId = sedes.find((s) => s.slug !== SEDE_PRINCIPAL).id;

  const admin = await crearUsuarioDePrueba({ rol: 'ADMINISTRADOR', sede: null });
  const marketing = await crearUsuarioDePrueba({ rol: 'MARKETING' });
  const secretaria = await crearUsuarioDePrueba({ rol: 'SECRETARIA' });
  const parroco = await crearUsuarioDePrueba({ rol: 'PARROCO' });
  sesiones.admin = await iniciarSesion(admin);
  sesiones.marketing = await iniciarSesion(marketing);
  sesiones.secretaria = await iniciarSesion(secretaria);
  sesiones.parroco = await iniciarSesion(parroco);

  servicioSlug = `${prefijo}-serv`;
  const sVis = await request(app)
    .post('/api/admin/servicios')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: sedePrincipalId,
      nombre: `Servicio ${prefijo}`,
      slug: servicioSlug,
      descripcionCorta: 'Servicio visible.',
      visible: true,
    });
  servicioId = sVis.body.datos.id;
  serviciosCreados.push(servicioId);

  servicioOcultoSlug = `${prefijo}-serv-oc`;
  const sOc = await request(app)
    .post('/api/admin/servicios')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: sedePrincipalId,
      nombre: `Servicio Oculto ${prefijo}`,
      slug: servicioOcultoSlug,
      descripcionCorta: 'Servicio oculto.',
      visible: false,
    });
  servicioOcultoId = sOc.body.datos.id;
  serviciosCreados.push(servicioOcultoId);

  const sAjeno = await request(app)
    .post('/api/admin/servicios')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: otraSedeId,
      nombre: `Servicio Ajeno ${prefijo}`,
      slug: `${prefijo}-serv-ajeno`,
      descripcionCorta: 'Servicio de otra sede.',
    });
  servicioAjenoId = sAjeno.body.datos.id;
  serviciosCreados.push(servicioAjenoId);

  grupoSlug = `${prefijo}-grupo`;
  const gVis = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: sedePrincipalId,
      nombre: `Grupo ${prefijo}`,
      slug: grupoSlug,
      visible: true,
    });
  grupoId = gVis.body.datos.id;
  gruposCreados.push(grupoId);

  grupoOcultoSlug = `${prefijo}-grupo-oc`;
  const gOc = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: sedePrincipalId,
      nombre: `Grupo Oculto ${prefijo}`,
      slug: grupoOcultoSlug,
      visible: false,
    });
  gruposCreados.push(gOc.body.datos.id);

  const gAjeno = await request(app)
    .post('/api/admin/grupos-pastorales')
    .set('Cookie', sesiones.admin)
    .send({
      sedeId: otraSedeId,
      nombre: `Grupo Ajeno ${prefijo}`,
      slug: `${prefijo}-grupo-ajeno`,
    });
  grupoAjenoId = gAjeno.body.datos.id;
  gruposCreados.push(gAjeno.body.datos.id);
});

afterAll(async () => {
  for (const id of publicacionesCreadas) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'publicacion' AND entidad_id = $1",
      [String(id)],
    );
    await consultar('DELETE FROM publicacion WHERE id = $1', [id]);
  }
  for (const id of serviciosCreados) {
    await consultar("DELETE FROM bitacora_cambio WHERE entidad = 'servicio' AND entidad_id = $1", [
      String(id),
    ]);
    await consultar('DELETE FROM servicio WHERE id = $1', [id]);
  }
  for (const id of gruposCreados) {
    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'grupo_pastoral' AND entidad_id = $1",
      [String(id)],
    );
    await consultar('DELETE FROM grupo_pastoral WHERE id = $1', [id]);
  }
  await limpiarContadoresDeIntentos();
  await borrarUsuariosDePrueba();
  await cerrarPool();
  await cerrarRedis();
});

describe('Etiquetado de noticias con sacramentos y grupos (PAR-166.2)', () => {
  it('rechaza etiquetas de otra sede, inexistentes, más de 10, o en un AVISO', async () => {
    const ajenoServ = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.marketing)
      .send({
        tipo: 'NOTICIA',
        titulo: `Ajeno serv ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: [servicioAjenoId],
      });
    expect(ajenoServ.status).toBe(400);
    expect(ajenoServ.body.error.detalles[0].campo).toBe('servicioIds');

    const ajenoGrupo = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.marketing)
      .send({
        tipo: 'NOTICIA',
        titulo: `Ajeno grupo ${prefijo}`,
        contenido: contenidoMinimo,
        grupoIds: [grupoAjenoId],
      });
    expect(ajenoGrupo.status).toBe(400);
    expect(ajenoGrupo.body.error.detalles[0].campo).toBe('grupoIds');

    const demasiados = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.marketing)
      .send({
        tipo: 'NOTICIA',
        titulo: `Muchos ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: Array.from({ length: 11 }, () => servicioId),
      });
    expect(demasiados.status).toBe(400);
    expect(demasiados.body.error.detalles[0].campo).toBe('servicioIds');

    const avisoConEtiquetas = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.secretaria)
      .send({
        tipo: 'AVISO',
        titulo: `Aviso etiquetas ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: [servicioId],
      });
    expect(avisoConEtiquetas.status).toBe(400);
    expect(avisoConEtiquetas.body.error.detalles[0].campo).toBe('servicioIds');
  });

  it('lista noticias vigentes por sacramento y grupo, paginadas, excluyendo borradores y vencidas, e invalidando al editar/archivar', async () => {
    // 1) Crear borrador relacionado -> NO debe aparecer en público todavía
    const borradorRes = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.parroco)
      .send({
        tipo: 'NOTICIA',
        titulo: `Noticia relacionada 1 ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: [servicioId],
        grupoIds: [grupoId],
      });
    expect(borradorRes.status).toBe(201);
    const id1 = borradorRes.body.datos.id;
    publicacionesCreadas.push(id1);
    expect(borradorRes.body.datos.serviciosRelacionados).toEqual([
      { id: servicioId, slug: servicioSlug, nombre: `Servicio ${prefijo}` },
    ]);
    expect(borradorRes.body.datos.gruposRelacionados).toEqual([
      { id: grupoId, slug: grupoSlug, nombre: `Grupo ${prefijo}` },
    ]);

    // Crear una noticia vencida relacionada -> NO debe aparecer en público
    const vencidaRes = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.parroco)
      .send({
        tipo: 'NOTA_DE_PRENSA',
        titulo: `Noticia vencida ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: [servicioId],
        fechaPublicacion: '2025-01-01T10:00:00-04:00',
        fechaExpiracion: '2025-01-10T10:00:00-04:00',
      });
    expect(vencidaRes.status).toBe(201);
    const idVencida = vencidaRes.body.datos.id;
    publicacionesCreadas.push(idVencida);
    await request(app)
      .post(`/api/admin/publicaciones/${idVencida}/publicar`)
      .set('Cookie', sesiones.parroco)
      .send({});

    const antes = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias`,
    );
    expect(antes.status).toBe(200);
    expect(antes.body.datos).toEqual([]);

    // 2) Publicar la noticia 1 -> aparece en ambos endpoints y en su detalle público
    const pubRes = await request(app)
      .post(`/api/admin/publicaciones/${id1}/publicar`)
      .set('Cookie', sesiones.parroco)
      .send({ fechaPublicacion: '2026-02-01T10:00:00-04:00' });
    expect(pubRes.status).toBe(200);

    const trasPublicarServ = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias`,
    );
    expect(trasPublicarServ.status).toBe(200);
    expect(trasPublicarServ.body.datos.map((p) => p.id)).toEqual([id1]);

    const trasPublicarGrupo = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales/${grupoSlug}/noticias`,
    );
    expect(trasPublicarGrupo.status).toBe(200);
    expect(trasPublicarGrupo.body.datos.map((p) => p.id)).toEqual([id1]);

    const detallePub = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/publicaciones/${borradorRes.body.datos.slug}`,
    );
    expect(detallePub.status).toBe(200);
    expect(detallePub.body.datos.serviciosRelacionados).toHaveLength(1);
    expect(detallePub.body.datos.gruposRelacionados).toHaveLength(1);

    // 3) Crear y publicar una segunda noticia más reciente -> paginación porPagina=1
    const res2 = await request(app)
      .post('/api/admin/publicaciones')
      .set('Cookie', sesiones.parroco)
      .send({
        tipo: 'NOTICIA',
        titulo: `Noticia relacionada 2 ${prefijo}`,
        contenido: contenidoMinimo,
        servicioIds: [servicioId],
      });
    const id2 = res2.body.datos.id;
    publicacionesCreadas.push(id2);
    await request(app)
      .post(`/api/admin/publicaciones/${id2}/publicar`)
      .set('Cookie', sesiones.parroco)
      .send({ fechaPublicacion: '2026-03-01T10:00:00-04:00' });

    const pag1 = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias?porPagina=1&pagina=1`,
    );
    expect(pag1.status).toBe(200);
    expect(pag1.body.datos.map((p) => p.id)).toEqual([id2]);
    expect(pag1.body.paginacion).toEqual({ pagina: 1, porPagina: 1, total: 2, totalPaginas: 2 });

    // porPagina > 12 -> 400
    const porPaginaAlto = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias?porPagina=13`,
    );
    expect(porPaginaAlto.status).toBe(400);

    // 4) Quitar etiqueta de id1 -> deja de aparecer
    const quitarEtiqueta = await request(app)
      .patch(`/api/admin/publicaciones/${id1}`)
      .set('Cookie', sesiones.parroco)
      .send({ servicioIds: [] });
    expect(quitarEtiqueta.status).toBe(200);

    const trasQuitar = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias`,
    );
    expect(trasQuitar.body.datos.map((p) => p.id)).toEqual([id2]);

    // 5) Archivar id2 -> deja de aparecer
    const archivar = await request(app)
      .post(`/api/admin/publicaciones/${id2}/archivar`)
      .set('Cookie', sesiones.parroco)
      .send({});
    expect(archivar.status).toBe(200);

    const trasArchivar = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioSlug}/noticias`,
    );
    expect(trasArchivar.body.datos).toEqual([]);
  });

  it('responde 404 si el servicio o grupo está oculto o no existe', async () => {
    const servOculto = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/${servicioOcultoSlug}/noticias`,
    );
    expect(servOculto.status).toBe(404);

    const grupoOculto = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/grupos-pastorales/${grupoOcultoSlug}/noticias`,
    );
    expect(grupoOculto.status).toBe(404);

    const noExiste = await request(app).get(
      `/api/sedes/${SEDE_PRINCIPAL}/servicios/inexistente-${prefijo}/noticias`,
    );
    expect(noExiste.status).toBe(404);
  });
});
