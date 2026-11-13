// Gestión de páginas y bloques (/api/admin/paginas) contra la aplicación real y PostgreSQL, con el
// contenido de los bloques validado con Ajv. Las páginas de prueba llevan un prefijo en el slug y
// se borran al final (con sus bloques); las páginas «inicio» y «nosotros» del seed no se tocan.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { ejemplosDeBloques } from '../apoyo/bloques.js';
import { crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');
const request = (await import('supertest')).default;

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const RUTA = '/api/admin/paginas';
const SUFIJO = String(Date.now()).slice(-9);
const PREFIJO = `prueba-pg-${SUFIJO}`;
let contador = 0;
let sede;
let sedeAjena;
let pdf;

const ejemplos = ejemplosDeBloques();

const pagina = (extra = {}) => ({
  slug: `${PREFIJO}-${++contador}`,
  titulo: `Página de prueba ${contador}`,
  ...extra,
});

async function crear(quien, extra) {
  const respuesta = await como(quien).post(RUTA, pagina(extra));
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  return respuesta.body.datos;
}

async function agregar(quien, paginaId, tipo, contenido, extra = {}) {
  const respuesta = await como(quien).post(`${RUTA}/${paginaId}/bloques`, {
    tipo,
    contenido,
    ...extra,
  });
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  return respuesta.body.datos;
}

const cita = (texto = 'Que la Pasión de Jesucristo esté siempre en nuestros corazones.') => ({
  texto,
  autor: 'Lema',
});

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });

  pdf = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.secretaria.id,
    tipoMime: 'application/pdf',
  });
});

afterAll(async () => {
  await panel.limpiar(async () => {
    // Las páginas de prueba: por prefijo, por sede de prueba o por autor (un slug regenerado
    // pierde el prefijo). Las hijas se borran antes que las madres.
    const donde = `slug LIKE $1 OR sede_id = $2 OR creado_por = ANY($3::int[])`;
    const parametros = [
      `${PREFIJO}%`,
      sedeAjena.id,
      Object.values(usuarios).map((usuario) => usuario.id),
    ];
    await consultar(
      `DELETE FROM bloque WHERE pagina_id IN (SELECT id FROM pagina WHERE ${donde})`,
      parametros,
    );
    await consultar(
      `DELETE FROM pagina WHERE pagina_padre_id IN (SELECT id FROM pagina WHERE ${donde})`,
      parametros,
    );
    await consultar(`DELETE FROM pagina WHERE ${donde}`, parametros);
  });
  await cerrarPool();
  await cerrarRedis();
});

describe('permisos', () => {
  it('sin sesión 401; Marketing lee pero no escribe (403)', async () => {
    expect((await como().get(RUTA)).status).toBe(401);
    expect((await como('marketing').get(RUTA)).status).toBe(200);

    const propia = await crear('secretaria');
    expect((await como('marketing').post(RUTA, pagina())).status).toBe(403);
    expect((await como('marketing').patch(`${RUTA}/${propia.id}`, { titulo: 'xx' })).status).toBe(
      403,
    );
    expect((await como('marketing').delete(`${RUTA}/${propia.id}`)).status).toBe(403);
    for (const ruta of [`/bloques`, `/bloques/reordenar`]) {
      expect((await como('marketing').post(`${RUTA}/${propia.id}${ruta}`, {})).status).toBe(403);
    }
    expect((await como('marketing').patch(`${RUTA}/${propia.id}/bloques/1`, {})).status).toBe(403);
    expect((await como('marketing').delete(`${RUTA}/${propia.id}/bloques/1`)).status).toBe(403);
  });
});

describe('páginas del seed (solo lectura)', () => {
  it('el detalle de «nosotros» trae sus bloques con el objeto del contrato', async () => {
    const lista = await como('secretaria').get(`${RUTA}?sede=${sede.slug}`);
    const nosotros = lista.body.datos.find((p) => p.slug === 'nosotros');

    const detalle = await como('secretaria').get(`${RUTA}/${nosotros.id}`);
    expect(detalle.status).toBe(200);
    const esperado = ejemploDelContrato('## 12. Páginas y bloques', 0, 'admin.md');
    expect(Object.keys(detalle.body.datos)).toEqual(Object.keys(esperado));
    expect(Object.keys(detalle.body.datos.bloques[0])).toEqual(Object.keys(esperado.bloques[0]));
    expect(detalle.body.datos.bloques.map((b) => [b.tipo, b.orden])).toEqual([
      ['texto_imagen', 1],
      ['cita', 2],
      ['tarjetas', 3],
    ]);
    expect(detalle.body.datos.creadoPor).toMatchObject({ id: expect.any(Number) });
  });
});

describe('POST /api/admin/paginas', () => {
  it('crea una página en BORRADOR sin bloques, con Location y bitácora', async () => {
    const respuesta = await como('secretaria').post(
      RUTA,
      pagina({
        descripcionSeo: 'Historia de la presencia pasionista.',
        mostrarEnMenu: true,
        ordenMenu: 7,
      }),
    );

    expect(respuesta.status).toBe(201);
    const datos = respuesta.body.datos;
    expect(respuesta.headers.location).toBe(`/api/admin/paginas/${datos.id}`);
    expect(datos).toMatchObject({
      sede: { id: sede.id, slug: sede.slug },
      estado: { codigo: 'BORRADOR', nombre: 'Borrador' },
      descripcionSeo: 'Historia de la presencia pasionista.',
      paginaPadre: null,
      mostrarEnMenu: true,
      ordenMenu: 7,
      creadoPor: { id: usuarios.secretaria.id, nombreCompleto: expect.any(String) },
      actualizadoPor: null,
      fechaCreacion: expect.stringMatching(/-04:00$/),
      fechaActualizacion: null,
      bloques: [],
    });

    expect((await registrosDe('pagina', datos.id))[0]).toMatchObject({
      usuario_id: usuarios.secretaria.id,
      accion: 'INSERT',
      datos_nuevos: { id: datos.id, sede_id: sede.id, slug: datos.slug },
    });
  });

  it('genera el slug desde el título si no se envía, y agrega un sufijo si ya existe', async () => {
    const titulo = `Ñandú ${SUFIJO}: ¡Nuestra historia!`;
    const primera = await crear('secretaria', { slug: null, titulo });
    const segunda = await crear('secretaria', { slug: undefined, titulo });

    expect(primera.slug).toBe(`nandu-${SUFIJO}-nuestra-historia`);
    expect(segunda.slug).toBe(`${primera.slug}-2`);
    await consultar('DELETE FROM pagina WHERE slug LIKE $1', [`nandu-${SUFIJO}%`]);
  });

  it('un slug enviado que ya existe es 409; en otra sede no choca', async () => {
    const existente = await crear('secretaria');
    const repetida = await como('parroco').post(RUTA, pagina({ slug: existente.slug }));
    expect(repetida.status).toBe(409);
    expect(repetida.body.error.detalles).toEqual([
      { campo: 'slug', mensaje: 'Ya está en uso en esta sede.' },
    ]);
    expect(
      (await como('admin').post(RUTA, pagina({ slug: existente.slug, sedeId: sedeAjena.id })))
        .status,
    ).toBe(201);
  });

  it('valida el cuerpo con un detalle por campo; EN_REVISION no vale', async () => {
    const respuesta = await como('secretaria').post(RUTA, {
      slug: 'Con Mayúsculas',
      titulo: '',
      descripcionSeo: 'x'.repeat(301),
      paginaPadreId: 'x',
      mostrarEnMenu: 'si',
      ordenMenu: 40000,
      estado: 'EN_REVISION',
      otro: 1,
    });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual(
      [
        'descripcionSeo',
        'estado',
        'mostrarEnMenu',
        'ordenMenu',
        'otro',
        'paginaPadreId',
        'slug',
        'titulo',
      ].sort(),
    );
  });

  it('la página padre debe ser de la misma sede', async () => {
    const madre = await crear('secretaria');
    const hija = await crear('secretaria', { paginaPadreId: madre.id });
    expect(hija.paginaPadre).toEqual({ id: madre.id, slug: madre.slug, titulo: madre.titulo });

    const ajena = await crear('secretariaAjena');
    for (const paginaPadreId of [ajena.id, 999999999]) {
      const respuesta = await como('secretaria').post(RUTA, pagina({ paginaPadreId }));
      expect(respuesta.body.error.detalles).toEqual([
        { campo: 'paginaPadreId', mensaje: 'La página padre no existe en esta sede.' },
      ]);
    }
  });

  it('sede: el Administrador sin sede indica sedeId; los demás usan la suya', async () => {
    expect((await como('admin').post(RUTA, pagina())).body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'Indica la sede.' },
    ]);
    expect((await crear('admin', { sedeId: sedeAjena.id })).sede.id).toBe(sedeAjena.id);
    expect((await crear('secretaria', { sedeId: sedeAjena.id })).sede.id).toBe(sede.id);
  });
});

describe('GET /api/admin/paginas', () => {
  let menu2;
  let menu1;
  let archivada;
  let ajena;
  const propias = (respuesta) =>
    respuesta.body.datos.filter((p) => p.titulo.startsWith('Lista ')).map((p) => p.id);

  beforeAll(async () => {
    menu2 = await crear('secretaria', { titulo: 'Lista B', ordenMenu: 52 });
    menu1 = await crear('secretaria', { titulo: 'Lista C', ordenMenu: 51 });
    archivada = await crear('secretaria', {
      titulo: 'Lista A',
      ordenMenu: 52,
      estado: 'ARCHIVADO',
    });
    ajena = await crear('secretariaAjena', { titulo: 'Lista D' });
  });

  it('sin paginar ni bloques, por orden de menú y título', async () => {
    const respuesta = await como('parroco').get(RUTA);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).not.toHaveProperty('paginacion');
    expect(propias(respuesta)).toEqual([menu1.id, archivada.id, menu2.id]);
    expect(respuesta.body.datos[0]).not.toHaveProperty('bloques');
  });

  it('filtra por estado; cada rol ve su sede y el Administrador filtra por sede', async () => {
    expect(propias(await como('parroco').get(`${RUTA}?estado=ARCHIVADO`))).toEqual([archivada.id]);

    const invalido = await como('parroco').get(`${RUTA}?estado=EN_REVISION`);
    expect(invalido.status).toBe(400);

    expect(propias(await como('secretariaAjena').get(RUTA))).toEqual([ajena.id]);
    expect((await como('secretaria').get(`${RUTA}?sede=${sedeAjena.slug}`)).status).toBe(403);
    expect(propias(await como('admin').get(`${RUTA}?sede=${sedeAjena.slug}`))).toEqual([ajena.id]);
  });

  it('el detalle: 404, 403 por sede y 400 si el id no es un número', async () => {
    expect((await como('parroco').get(`${RUTA}/${menu1.id}`)).body.datos.id).toBe(menu1.id);
    expect((await como('parroco').get(`${RUTA}/999999999`)).status).toBe(404);
    expect((await como('parroco').get(`${RUTA}/${ajena.id}`)).status).toBe(403);
    expect((await como('parroco').get(`${RUTA}/abc`)).status).toBe(400);
  });
});

describe('PATCH /api/admin/paginas/:id', () => {
  it('cambia solo lo enviado, deja actualizadoPor y fechaActualizacion y lo registra', async () => {
    const creada = await crear('secretaria', { descripcionSeo: 'Inicial', ordenMenu: 3 });

    const respuesta = await como('parroco').patch(`${RUTA}/${creada.id}`, {
      titulo: 'Título nuevo',
      descripcionSeo: null,
      estado: 'PUBLICADO',
      mostrarEnMenu: true,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      slug: creada.slug,
      titulo: 'Título nuevo',
      descripcionSeo: null,
      ordenMenu: 3,
      mostrarEnMenu: true,
      estado: { codigo: 'PUBLICADO' },
      creadoPor: { id: usuarios.secretaria.id },
      actualizadoPor: { id: usuarios.parroco.id },
      fechaActualizacion: expect.stringMatching(/-04:00$/),
    });
    expect((await registrosDe('pagina', creada.id)).at(-1)).toMatchObject({
      usuario_id: usuarios.parroco.id,
      accion: 'UPDATE',
      datos_anteriores: {
        titulo: creada.titulo,
        descripcion_seo: 'Inicial',
        actualizado_por: null,
      },
      datos_nuevos: {
        titulo: 'Título nuevo',
        descripcion_seo: null,
        actualizado_por: usuarios.parroco.id,
      },
    });
  });

  it('slug: null lo genera desde el título; uno repetido es 409; EN_REVISION y campos ajenos 400', async () => {
    const otra = await crear('secretaria');
    const creada = await crear('secretaria');

    const regenerado = await como('secretaria').patch(`${RUTA}/${creada.id}`, {
      slug: null,
      titulo: `Nuevo ${SUFIJO} título`,
    });
    expect(regenerado.body.datos.slug).toBe(`nuevo-${SUFIJO}-titulo`);

    expect(
      (await como('secretaria').patch(`${RUTA}/${creada.id}`, { slug: otra.slug })).status,
    ).toBe(409);

    const invalido = await como('secretaria').patch(`${RUTA}/${creada.id}`, {
      estado: 'EN_REVISION',
      sedeId: 1,
    });
    expect(invalido.body.error.detalles.map((d) => d.campo).sort()).toEqual(['estado', 'sedeId']);
  });

  it('la página padre: de la misma sede y sin ciclos', async () => {
    const abuela = await crear('secretaria');
    const madre = await crear('secretaria', { paginaPadreId: abuela.id });
    const nieta = await crear('secretaria', { paginaPadreId: madre.id });
    const ajena = await crear('secretariaAjena');

    for (const [pagina, padre] of [
      [abuela, abuela],
      [abuela, nieta],
      [madre, nieta],
    ]) {
      const respuesta = await como('secretaria').patch(`${RUTA}/${pagina.id}`, {
        paginaPadreId: padre.id,
      });
      expect(respuesta.status).toBe(400);
      expect(respuesta.body.error.detalles[0]).toMatchObject({
        campo: 'paginaPadreId',
        mensaje: 'No puede ser la propia página ni una de sus páginas hijas.',
      });
    }
    const otraSede = await como('secretaria').patch(`${RUTA}/${madre.id}`, {
      paginaPadreId: ajena.id,
    });
    expect(otraSede.status).toBe(400);

    const quitar = await como('secretaria').patch(`${RUTA}/${madre.id}`, { paginaPadreId: null });
    expect(quitar.body.datos.paginaPadre).toBeNull();
  });

  describe('profundidad máxima del árbol (3 niveles)', () => {
    const MENSAJE = 'Las páginas se pueden anidar hasta 3 niveles.';
    const errorDePadre = (respuesta) => respuesta.body.error.detalles;

    it('acepta una raíz con hijas y nietas, pero no una bisnieta', async () => {
      const raiz = await crear('secretaria');
      const hija = await crear('secretaria', { paginaPadreId: raiz.id });
      const nieta = await crear('secretaria', { paginaPadreId: hija.id });
      expect(nieta.paginaPadre).toMatchObject({ id: hija.id });

      const bisnieta = await como('secretaria').post(RUTA, pagina({ paginaPadreId: nieta.id }));
      expect(bisnieta.status).toBe(400);
      expect(errorDePadre(bisnieta)).toEqual([{ campo: 'paginaPadreId', mensaje: MENSAJE }]);
    });

    it('al mover una página cuenta también sus descendientes', async () => {
      const raiz = await crear('secretaria');
      const hija = await crear('secretaria', { paginaPadreId: raiz.id });
      // Una rama de dos niveles (madre con una hija) ya no cabe bajo una página de nivel 2.
      const madre = await crear('secretaria');
      await crear('secretaria', { paginaPadreId: madre.id });

      const bajoHija = await como('secretaria').patch(`${RUTA}/${madre.id}`, {
        paginaPadreId: hija.id,
      });
      expect(bajoHija.status).toBe(400);
      expect(errorDePadre(bajoHija)).toEqual([{ campo: 'paginaPadreId', mensaje: MENSAJE }]);

      // Bajo una raíz sí cabe (queda de nivel 2 con su hija en el 3).
      const bajoRaiz = await como('secretaria').patch(`${RUTA}/${madre.id}`, {
        paginaPadreId: raiz.id,
      });
      expect(bajoRaiz.status).toBe(200);
    });

    it('una página sin hijas sí se puede mover al nivel 3; volver a la raíz siempre se puede', async () => {
      const raiz = await crear('secretaria');
      const hija = await crear('secretaria', { paginaPadreId: raiz.id });
      const suelta = await crear('secretaria');

      const nivel3 = await como('secretaria').patch(`${RUTA}/${suelta.id}`, {
        paginaPadreId: hija.id,
      });
      expect(nivel3.status).toBe(200);

      const aLaRaiz = await como('secretaria').patch(`${RUTA}/${suelta.id}`, {
        paginaPadreId: null,
      });
      expect(aLaRaiz.status).toBe(200);
      expect(aLaRaiz.body.datos.paginaPadre).toBeNull();
    });

    it('cambiar otros campos de una página en el nivel 3 no revalida el árbol', async () => {
      const raiz = await crear('secretaria');
      const hija = await crear('secretaria', { paginaPadreId: raiz.id });
      const nieta = await crear('secretaria', { paginaPadreId: hija.id });

      const respuesta = await como('secretaria').patch(`${RUTA}/${nieta.id}`, {
        titulo: 'Nieta editada',
      });
      expect(respuesta.status).toBe(200);
    });
  });

  it('«inicio» y «nosotros» no cambian de slug (el portal depende de ellas)', async () => {
    const propia = await panel.crearSede();
    const inicio = await como('admin').post(RUTA, pagina({ slug: 'inicio', sedeId: propia.id }));
    expect(inicio.status).toBe(201);

    const respuesta = await como('admin').patch(`${RUTA}/${inicio.body.datos.id}`, {
      slug: 'portada',
    });
    expect(respuesta.status).toBe(409);
    // Reenviar el mismo slug no es un cambio.
    expect(
      (await como('admin').patch(`${RUTA}/${inicio.body.datos.id}`, { slug: 'inicio' })).status,
    ).toBe(200);

    await consultar('DELETE FROM pagina WHERE sede_id = $1', [propia.id]);
  });

  it('404 y 403 por sede', async () => {
    const ajena = await crear('secretariaAjena');
    expect((await como('secretaria').patch(`${RUTA}/999999999`, { titulo: 'xx' })).status).toBe(
      404,
    );
    expect((await como('secretaria').patch(`${RUTA}/${ajena.id}`, { titulo: 'xx' })).status).toBe(
      403,
    );
  });
});

describe('DELETE /api/admin/paginas/:id', () => {
  it('elimina la página y sus bloques (204) y registra todo', async () => {
    const creada = await crear('secretaria');
    const bloque = await agregar('secretaria', creada.id, 'cita', cita());

    expect((await como('secretaria').delete(`${RUTA}/${creada.id}`)).status).toBe(204);
    expect((await como('secretaria').get(`${RUTA}/${creada.id}`)).status).toBe(404);

    const { rows } = await consultar('SELECT 1 FROM bloque WHERE pagina_id = $1', [creada.id]);
    expect(rows).toHaveLength(0);
    expect((await registrosDe('pagina', creada.id)).at(-1)).toMatchObject({
      accion: 'DELETE',
      datos_anteriores: { id: creada.id },
      datos_nuevos: null,
    });
    expect((await registrosDe('bloque', bloque.id)).at(-1)).toMatchObject({
      accion: 'DELETE',
      datos_anteriores: { id: bloque.id, pagina_id: creada.id, sede_id: sede.id },
    });
  });

  it('con páginas hijas es 409', async () => {
    const madre = await crear('secretaria');
    const hija = await crear('secretaria', { paginaPadreId: madre.id });

    const respuesta = await como('secretaria').delete(`${RUTA}/${madre.id}`);
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('CONFLICTO');

    expect((await como('secretaria').delete(`${RUTA}/${hija.id}`)).status).toBe(204);
    expect((await como('secretaria').delete(`${RUTA}/${madre.id}`)).status).toBe(204);
  });

  it('«inicio» y «nosotros» no se pueden eliminar (409), tampoco en otra sede', async () => {
    const propia = await panel.crearSede();
    for (const slug of ['inicio', 'nosotros']) {
      const creada = await como('admin').post(RUTA, pagina({ slug, sedeId: propia.id }));
      const respuesta = await como('admin').delete(`${RUTA}/${creada.body.datos.id}`);
      expect(respuesta.status).toBe(409);
      expect(respuesta.body.error.mensaje).toBe(
        `La página «${slug}» no se puede eliminar: el portal depende de ella.`,
      );
    }

    // Las del seed siguen existiendo.
    const lista = await como('admin').get(`${RUTA}?sede=${sede.slug}`);
    expect(lista.body.datos.map((p) => p.slug)).toEqual(
      expect.arrayContaining(['inicio', 'nosotros']),
    );
    await consultar('DELETE FROM pagina WHERE sede_id = $1', [propia.id]);
  });

  it('404 y 403 por sede', async () => {
    const ajena = await crear('secretariaAjena');
    expect((await como('secretaria').delete(`${RUTA}/999999999`)).status).toBe(404);
    expect((await como('secretaria').delete(`${RUTA}/${ajena.id}`)).status).toBe(403);
  });
});

describe('POST /api/admin/paginas/:id/bloques', () => {
  it('agrega cada tipo de bloque (con los ejemplos del contrato) al final, con Location y bitácora', async () => {
    const creada = await crear('secretaria');
    const tipos = ['hero_video', 'texto_imagen', 'tarjetas', 'cita', 'galeria', 'video_youtube'];

    const bloques = [];
    for (const tipo of tipos) {
      const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
        tipo,
        contenido: ejemplos[tipo][0],
      });
      expect(respuesta.status, `${tipo}: ${JSON.stringify(respuesta.body)}`).toBe(201);
      expect(respuesta.headers.location).toBe(
        `${RUTA}/${creada.id}/bloques/${respuesta.body.datos.id}`,
      );
      bloques.push(respuesta.body.datos);
    }

    expect(bloques.map((b) => [b.tipo, b.orden, b.visible])).toEqual(
      tipos.map((tipo, i) => [tipo, i + 1, true]),
    );
    const esperado = ejemploDelContrato('## 12. Páginas y bloques', 0, 'admin.md').bloques[0];
    expect(Object.keys(bloques[0])).toEqual(Object.keys(esperado));
    expect(bloques[3].contenido).toEqual(ejemplos.cita[0]);
    expect(bloques[0].fechaActualizacion).toMatch(/-04:00$/);

    const [registro] = await registrosDe('bloque', bloques[0].id);
    expect(registro).toMatchObject({
      usuario_id: usuarios.secretaria.id,
      accion: 'INSERT',
      datos_nuevos: { id: bloques[0].id, pagina_id: creada.id, sede_id: sede.id, orden: 1 },
    });

    const detalle = await como('secretaria').get(`${RUTA}/${creada.id}`);
    expect(detalle.body.datos.bloques.map((b) => b.id)).toEqual(bloques.map((b) => b.id));
    expect(detalle.body.datos.actualizadoPor).toMatchObject({ id: usuarios.secretaria.id });
  });

  it('visible: false se guarda y el detalle del panel incluye los no visibles', async () => {
    const creada = await crear('secretaria');
    const oculto = await agregar('secretaria', creada.id, 'cita', cita(), { visible: false });
    expect(oculto.visible).toBe(false);
    expect((await como('secretaria').get(`${RUTA}/${creada.id}`)).body.datos.bloques).toHaveLength(
      1,
    );
  });

  it('un tipo inexistente es 400 en «tipo»', async () => {
    const creada = await crear('secretaria');
    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      tipo: 'carrusel',
      contenido: {},
    });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'tipo', mensaje: 'El tipo de bloque «carrusel» no existe.' },
    ]);
  });

  it('un contenido inválido es 400 con la ruta de cada error y no guarda nada', async () => {
    const creada = await crear('secretaria');
    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      tipo: 'tarjetas',
      contenido: {
        titulo: 'x'.repeat(121),
        items: [
          { titulo: 'Sin enlace válido', enlace: 'javascript:alert(1)', icono: 'Reloj' },
          { subtitulo: 'Falta el título', extra: true },
        ],
      },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.mensaje).toBe('El contenido del bloque no es válido.');
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual(
      [
        'contenido.titulo',
        'contenido.items.0.enlace',
        'contenido.items.0.icono',
        'contenido.items.1.titulo',
        'contenido.items.1.extra',
      ].sort(),
    );
    expect((await como('secretaria').get(`${RUTA}/${creada.id}`)).body.datos.bloques).toEqual([]);
  });

  it('el error del contrato: un campo obligatorio que falta', async () => {
    const creada = await crear('secretaria');
    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      tipo: 'cita',
      contenido: {},
    });
    expect(respuesta.body.error).toEqual({
      codigo: 'VALIDACION',
      mensaje: 'El contenido del bloque no es válido.',
      detalles: [{ campo: 'contenido.texto', mensaje: 'Es obligatorio.' }],
    });
  });

  it('las imágenes y los videos deben ser de la biblioteca de la sede y de su clase', async () => {
    const creada = await crear('secretaria');
    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      tipo: 'hero_video',
      contenido: {
        titulo: 'Portada',
        url_video: '/media/seed/altar.webp',
        url_poster: pdf.url,
      },
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'contenido.url_video', mensaje: 'El archivo no es un video.' },
      { campo: 'contenido.url_poster', mensaje: 'El archivo no es una imagen.' },
    ]);

    const noExiste = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      tipo: 'galeria',
      contenido: {
        imagenes: [{ url: '/media/seed/no-existe.webp', texto_alternativo: 'Foto' }],
      },
    });
    expect(noExiste.body.error.detalles).toEqual([
      {
        campo: 'contenido.imagenes.0.url',
        mensaje: 'Debe ser una imagen de la biblioteca multimedia de esta sede.',
      },
    ]);
  });

  it('valida el cuerpo del bloque: tipo, contenido y visible', async () => {
    const creada = await crear('secretaria');
    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques`, {
      contenido: 'texto',
      visible: 'si',
      otro: 1,
    });
    expect(respuesta.body.error.detalles.map((d) => d.campo).sort()).toEqual(
      ['contenido', 'otro', 'tipo', 'visible'].sort(),
    );
  });

  it('404 si la página no existe y 403 si es de otra sede', async () => {
    const ajena = await crear('secretariaAjena');
    const cuerpo = { tipo: 'cita', contenido: cita() };
    expect((await como('secretaria').post(`${RUTA}/999999999/bloques`, cuerpo)).status).toBe(404);
    expect((await como('secretaria').post(`${RUTA}/${ajena.id}/bloques`, cuerpo)).status).toBe(403);
  });
});

describe('PATCH /api/admin/paginas/:id/bloques/:bloqueId', () => {
  it('reemplaza el contenido y cambia la visibilidad; el portal solo muestra los visibles', async () => {
    const creada = await crear('secretaria', { estado: 'PUBLICADO' });
    const uno = await agregar('secretaria', creada.id, 'cita', cita('Primera cita'));
    const dos = await agregar('secretaria', creada.id, 'cita', cita('Segunda cita'));

    const editado = await como('parroco').patch(`${RUTA}/${creada.id}/bloques/${uno.id}`, {
      contenido: { texto: 'Cita corregida' },
    });
    expect(editado.status).toBe(200);
    // El contenido se reemplaza completo: el autor anterior ya no está.
    expect(editado.body.datos).toMatchObject({
      id: uno.id,
      tipo: 'cita',
      contenido: { texto: 'Cita corregida' },
      visible: true,
    });
    expect(editado.body.datos.contenido).not.toHaveProperty('autor');

    const oculto = await como('parroco').patch(`${RUTA}/${creada.id}/bloques/${dos.id}`, {
      visible: false,
    });
    expect(oculto.body.datos).toMatchObject({ visible: false, contenido: cita('Segunda cita') });

    const publico = await request(app).get(`/api/sedes/${sede.slug}/paginas/${creada.slug}`);
    expect(publico.body.datos.bloques.map((b) => b.id)).toEqual([uno.id]);
    const panelVista = await como('parroco').get(`${RUTA}/${creada.id}`);
    expect(panelVista.body.datos.bloques.map((b) => b.id)).toEqual([uno.id, dos.id]);
    expect(panelVista.body.datos.actualizadoPor).toMatchObject({ id: usuarios.parroco.id });

    const registros = await registrosDe('bloque', uno.id);
    expect(registros.at(-1)).toMatchObject({
      usuario_id: usuarios.parroco.id,
      accion: 'UPDATE',
      datos_anteriores: { contenido: cita('Primera cita') },
      datos_nuevos: { contenido: { texto: 'Cita corregida' } },
    });
  });

  it('el nuevo contenido se valida con el esquema del tipo; el tipo no se puede cambiar', async () => {
    const creada = await crear('secretaria');
    const bloque = await agregar('secretaria', creada.id, 'cita', cita());

    const invalido = await como('secretaria').patch(`${RUTA}/${creada.id}/bloques/${bloque.id}`, {
      contenido: { autor: 'Sin texto' },
    });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.detalles).toEqual([
      { campo: 'contenido.texto', mensaje: 'Es obligatorio.' },
    ]);

    const tipo = await como('secretaria').patch(`${RUTA}/${creada.id}/bloques/${bloque.id}`, {
      tipo: 'galeria',
    });
    expect(tipo.status).toBe(400);
    expect(tipo.body.error.detalles).toEqual([
      { campo: 'tipo', mensaje: 'El tipo no se puede cambiar.' },
    ]);
  });

  it('solo visible no revalida el contenido; 404 si el bloque es de otra página; 403 por sede', async () => {
    const creada = await crear('secretaria');
    const otra = await crear('secretaria');
    const bloque = await agregar('secretaria', creada.id, 'cita', cita());
    const ajena = await crear('secretariaAjena');
    const bloqueAjeno = await agregar('secretariaAjena', ajena.id, 'cita', cita());

    expect(
      (
        await como('secretaria').patch(`${RUTA}/${creada.id}/bloques/${bloque.id}`, {
          visible: false,
        })
      ).status,
    ).toBe(200);
    expect(
      (await como('secretaria').patch(`${RUTA}/${otra.id}/bloques/${bloque.id}`, { visible: true }))
        .status,
    ).toBe(404);
    expect(
      (await como('secretaria').patch(`${RUTA}/${creada.id}/bloques/999999999`, { visible: true }))
        .status,
    ).toBe(404);
    expect(
      (
        await como('secretaria').patch(`${RUTA}/${ajena.id}/bloques/${bloqueAjeno.id}`, {
          visible: true,
        })
      ).status,
    ).toBe(403);
  });
});

describe('DELETE /api/admin/paginas/:id/bloques/:bloqueId', () => {
  it('elimina el bloque (204), lo registra con la sede y actualiza la página', async () => {
    const creada = await crear('secretaria');
    const bloque = await agregar('secretaria', creada.id, 'cita', cita());

    expect((await como('parroco').delete(`${RUTA}/${creada.id}/bloques/${bloque.id}`)).status).toBe(
      204,
    );
    expect((await como('parroco').get(`${RUTA}/${creada.id}`)).body.datos.bloques).toEqual([]);
    expect((await registrosDe('bloque', bloque.id)).at(-1)).toMatchObject({
      usuario_id: usuarios.parroco.id,
      accion: 'DELETE',
      datos_anteriores: { id: bloque.id, sede_id: sede.id },
      datos_nuevos: null,
    });
  });

  it('el Párroco ve en la bitácora los cambios de bloques de su sede, también los borrados', async () => {
    const creada = await crear('secretaria');
    const bloque = await agregar('secretaria', creada.id, 'cita', cita());
    await como('secretaria').delete(`${RUTA}/${creada.id}/bloques/${bloque.id}`);

    const propia = await como('parroco').get(
      `/api/admin/bitacora?entidad=bloque&entidadId=${bloque.id}`,
    );
    expect(propia.body.datos.map((c) => c.accion).sort()).toEqual(['DELETE', 'INSERT']);

    const otroParroco = await panel.conSesion('parrocoAjeno', {
      rol: 'PARROCO',
      sede: sedeAjena.slug,
    });
    expect(otroParroco).toBeTruthy();
    const ajena = await como('parrocoAjeno').get(
      `/api/admin/bitacora?entidad=bloque&entidadId=${bloque.id}`,
    );
    expect(ajena.body.datos).toEqual([]);
  });

  it('404 si el bloque no es de la página y 403 por sede', async () => {
    const creada = await crear('secretaria');
    const ajena = await crear('secretariaAjena');
    const bloqueAjeno = await agregar('secretariaAjena', ajena.id, 'cita', cita());

    expect((await como('secretaria').delete(`${RUTA}/${creada.id}/bloques/999999999`)).status).toBe(
      404,
    );
    expect(
      (await como('secretaria').delete(`${RUTA}/${ajena.id}/bloques/${bloqueAjeno.id}`)).status,
    ).toBe(403);
  });
});

describe('POST /api/admin/paginas/:id/bloques/reordenar', () => {
  it('recibe todos los ids en el nuevo orden y responde la lista ordenada (orden 1, 2, 3…)', async () => {
    const creada = await crear('secretaria');
    const a = await agregar('secretaria', creada.id, 'cita', cita('A'));
    const b = await agregar('secretaria', creada.id, 'cita', cita('B'));
    const c = await agregar('secretaria', creada.id, 'cita', cita('C'));

    const respuesta = await como('parroco').post(`${RUTA}/${creada.id}/bloques/reordenar`, {
      ids: [c.id, a.id, b.id],
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos.map((x) => [x.id, x.orden])).toEqual([
      [c.id, 1],
      [a.id, 2],
      [b.id, 3],
    ]);
    const detalle = await como('parroco').get(`${RUTA}/${creada.id}`);
    expect(detalle.body.datos.bloques.map((x) => x.id)).toEqual([c.id, a.id, b.id]);

    // Solo se registran los bloques que cambiaron de orden (a: 1→2, b: 2→3, c: 3→1).
    for (const bloque of [a, b, c]) {
      expect((await registrosDe('bloque', bloque.id)).at(-1)).toMatchObject({
        usuario_id: usuarios.parroco.id,
        accion: 'UPDATE',
        datos_nuevos: { orden: expect.any(Number) },
      });
    }
  });

  it('un reorden que no cambia nada no registra cambios', async () => {
    const creada = await crear('secretaria');
    const a = await agregar('secretaria', creada.id, 'cita', cita('A'));
    const b = await agregar('secretaria', creada.id, 'cita', cita('B'));
    const antes = (await registrosDe('bloque', a.id)).length;

    const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques/reordenar`, {
      ids: [a.id, b.id],
    });
    expect(respuesta.status).toBe(200);
    expect((await registrosDe('bloque', a.id)).length).toBe(antes);
  });

  it('faltan, sobran, se repiten o son de otra página: 400 en «ids» y no cambia nada', async () => {
    const creada = await crear('secretaria');
    const otra = await crear('secretaria');
    const a = await agregar('secretaria', creada.id, 'cita', cita('A'));
    const b = await agregar('secretaria', creada.id, 'cita', cita('B'));
    const ajeno = await agregar('secretaria', otra.id, 'cita', cita('X'));

    for (const ids of [[a.id], [a.id, b.id, ajeno.id], [a.id, a.id], [a.id, ajeno.id], []]) {
      const respuesta = await como('secretaria').post(`${RUTA}/${creada.id}/bloques/reordenar`, {
        ids,
      });
      expect(respuesta.status, JSON.stringify(ids)).toBe(400);
      expect(respuesta.body.error.detalles).toEqual([
        {
          campo: 'ids',
          mensaje: 'Debe incluir todos los bloques de la página, una vez cada uno, y ninguno más.',
        },
      ]);
    }
    const detalle = await como('secretaria').get(`${RUTA}/${creada.id}`);
    expect(detalle.body.datos.bloques.map((x) => x.id)).toEqual([a.id, b.id]);

    expect(
      (await como('secretaria').post(`${RUTA}/${creada.id}/bloques/reordenar`, {})).status,
    ).toBe(400);
    expect(
      (await como('secretaria').post(`${RUTA}/${creada.id}/bloques/reordenar`, { ids: ['a'] }))
        .status,
    ).toBe(400);
  });

  it('una página sin bloques acepta una lista vacía; 404 y 403 por sede', async () => {
    const vacia = await crear('secretaria');
    const ajena = await crear('secretariaAjena');
    const reordenar = (id, ids = []) =>
      como('secretaria').post(`${RUTA}/${id}/bloques/reordenar`, { ids });

    const respuesta = await reordenar(vacia.id);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toEqual([]);
    expect((await reordenar(999999999)).status).toBe(404);
    expect((await reordenar(ajena.id)).status).toBe(403);
  });
});
