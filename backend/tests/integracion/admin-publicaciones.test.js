// CRUD de publicaciones del panel (/api/admin/publicaciones) contra la aplicación real y
// PostgreSQL: creación con slug único por sede, edición parcial, eliminación, alcance por sede,
// referencias y bitácora. Cada prueba crea sus propios datos; al final se borran.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ejemploDelContrato } from '../apoyo/contrato.js';
import { archivoDelSeed, crearPanel, registrosDe, sedePrincipal } from '../apoyo/panel.js';

vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool } = await import('../../src/db/index.js');
const { cerrarRedis } = await import('../../src/db/redis.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

const RUTA = '/api/admin/publicaciones';
const parrafo = (texto, id = 'p1') => ({
  id,
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: [{ type: 'text', text: texto, styles: {} }],
  children: [],
});
const imagenEnContenido = (url, id = 'i1') => ({
  id,
  type: 'image',
  props: { url, caption: 'Foto', showPreview: true },
  children: [],
});
const documento = (...bloques) => ({ formato: 'blocknote', version: 1, bloques });

// Prefijo único de los títulos de este archivo (para buscarlos y limpiarlos).
const PREFIJO = `Prueba admin ${Date.now()}`;
const noticia = (extra = {}) => ({
  tipo: 'NOTICIA',
  titulo: `${PREFIJO} noticia`,
  contenido: documento(parrafo('Texto de la noticia.')),
  ...extra,
});

let sede;
let sedeAjena;
let altar;
let pdfPropio;
let imagenAjena;
let imagenCdn;

async function crear(quien, cuerpo) {
  const respuesta = await como(quien).post(RUTA, cuerpo);
  expect(respuesta.status, JSON.stringify(respuesta.body)).toBe(201);
  return respuesta.body.datos;
}

// Cambia el estado directamente en la base (las transiciones tienen sus propias pruebas).
const ponerEstado = (id, nombre, extra = '') =>
  consultar(
    `UPDATE publicacion SET estado_publicacion_id = (SELECT id FROM estado_publicacion WHERE nombre = $2)${extra}
      WHERE id = $1`,
    [id, nombre],
  );

beforeAll(async () => {
  sede = await sedePrincipal();
  sedeAjena = await panel.crearSede();
  altar = await archivoDelSeed('/media/seed/altar.webp');

  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO' });
  await panel.conSesion('secretaria', { rol: 'SECRETARIA' });
  await panel.conSesion('marketing', { rol: 'MARKETING' });
  await panel.conSesion('marketing2', { rol: 'MARKETING' });
  await panel.conSesion('secretariaAjena', { rol: 'SECRETARIA', sede: sedeAjena.slug });

  pdfPropio = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.marketing.id,
    tipoMime: 'application/pdf',
  });
  imagenAjena = await panel.crearArchivo({
    sedeId: sedeAjena.id,
    subidoPor: usuarios.secretariaAjena.id,
    tipoMime: 'image/webp',
  });
  imagenCdn = await panel.crearArchivo({
    sedeId: sede.id,
    subidoPor: usuarios.marketing.id,
    tipoMime: 'image/webp',
    clave: `sedes/${sede.slug}/2026/11/0b1e9c2a-7d3f-4e8a-9c61-${Date.now().toString().slice(-12).padStart(12, '0')}.webp`,
    ancho: 2000,
  });
});

afterAll(async () => {
  await panel.limpiar(() =>
    consultar('DELETE FROM publicacion WHERE titulo LIKE $1', [`${PREFIJO}%`]),
  );
  await cerrarPool();
  await cerrarRedis();
});

describe('sesión', () => {
  it('sin sesión responde 401', async () => {
    const respuesta = await como().get(RUTA);
    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });
});

describe('POST /api/admin/publicaciones', () => {
  it('crea en BORRADOR, con el objeto del contrato, la cabecera Location y la bitácora', async () => {
    const respuesta = await como('marketing').post(
      RUTA,
      noticia({
        titulo: `${PREFIJO} Solemnidad de Cristo Rey: invitación`,
        resumen: 'Misa solemne y procesión.',
        categoriaId: 2,
        imagenPortadaId: altar.id,
        destacada: true,
        fechaPublicacion: '2026-11-15T08:00:00-04:00',
        fechaExpiracion: '2026-11-23T04:00:00Z',
      }),
    );

    expect(respuesta.status).toBe(201);
    const datos = respuesta.body.datos;
    expect(respuesta.headers.location).toBe(`/api/admin/publicaciones/${datos.id}`);
    expect(Object.keys(datos)).toEqual(
      Object.keys(ejemploDelContrato('## 3. Publicaciones', 0, 'admin.md')),
    );
    expect(datos).toMatchObject({
      sede: { id: sede.id, slug: sede.slug },
      tipo: { codigo: 'NOTICIA', nombre: 'Noticia' },
      estado: { codigo: 'BORRADOR', nombre: 'Borrador' },
      slug: expect.stringMatching(/-solemnidad-de-cristo-rey-invitacion$/),
      categoria: { id: 2, nombre: expect.any(String), slug: expect.any(String) },
      imagenPortada: { id: altar.id, url: '/media/seed/altar.webp', variantes: [] },
      urlExterna: null,
      destacada: true,
      fechaPublicacion: '2026-11-15T08:00:00-04:00',
      fechaExpiracion: '2026-11-23T00:00:00-04:00',
      autor: { id: usuarios.marketing.id, nombreCompleto: expect.any(String) },
      revision: null,
      visibleEnPortal: false,
      acciones: ['EDITAR', 'ELIMINAR', 'ENVIAR_REVISION'],
    });
    expect(datos.contenido).toEqual(documento(parrafo('Texto de la noticia.')));
    expect(datos.fechaCreacion).toMatch(/-04:00$/);

    const [registro] = await registrosDe('publicacion', datos.id);
    expect(registro).toMatchObject({
      usuario_id: usuarios.marketing.id,
      accion: 'INSERT',
      datos_anteriores: null,
      datos_nuevos: {
        id: datos.id,
        sede_id: sede.id,
        slug: datos.slug,
        autor_id: usuarios.marketing.id,
      },
    });
  });

  it('genera el slug desde el título y agrega un sufijo si ya existe en la sede', async () => {
    const titulo = `${PREFIJO} Ñandú: ¡Día de la Pastoral!`;
    const primera = await crear('marketing', noticia({ titulo }));
    const segunda = await crear('marketing', noticia({ titulo }));
    const tercera = await crear('marketing', noticia({ titulo, slug: null }));

    expect(primera.slug).toMatch(/-nandu-dia-de-la-pastoral$/);
    expect(segunda.slug).toBe(`${primera.slug}-2`);
    expect(tercera.slug).toBe(`${primera.slug}-3`);
  });

  it('un slug enviado que ya existe en la sede es 409; en otra sede no choca', async () => {
    const slug = `prueba-slug-${Date.now()}`;
    await crear('marketing', noticia({ slug }));

    const repetido = await como('parroco').post(RUTA, noticia({ slug }));
    expect(repetido.status).toBe(409);
    expect(repetido.body.error).toMatchObject({
      codigo: 'CONFLICTO',
      mensaje: `Ya existe una publicación con el slug «${slug}» en esta sede.`,
      detalles: [{ campo: 'slug', mensaje: expect.any(String) }],
    });

    const otraSede = await como('admin').post(RUTA, noticia({ slug, sedeId: sedeAjena.id }));
    expect(otraSede.status).toBe(201);
    expect(otraSede.body.datos.sede.id).toBe(sedeAjena.id);
  });

  it('el permiso depende del tipo: avisos.gestionar o noticias.redactar', async () => {
    const aviso = { tipo: 'AVISO', titulo: `${PREFIJO} aviso`, contenido: documento() };

    const marketingAviso = await como('marketing').post(RUTA, aviso);
    expect(marketingAviso.status).toBe(403);
    expect(marketingAviso.body.error.mensaje).toBe('Tu rol no tiene permiso para crear avisos.');

    const secretariaNoticia = await como('secretaria').post(RUTA, noticia());
    expect(secretariaNoticia.status).toBe(403);

    expect((await como('secretaria').post(RUTA, aviso)).status).toBe(201);
    const nota = await crear('marketing', noticia({ tipo: 'NOTA_DE_PRENSA' }));
    expect(nota.tipo).toEqual({ codigo: 'NOTA_DE_PRENSA', nombre: 'Nota de prensa' });
  });

  it('valida el cuerpo y responde 400 con un detalle por campo', async () => {
    const respuesta = await como('marketing').post(RUTA, {
      tipo: 'BOLETIN',
      titulo: 'ab',
      resumen: 'x'.repeat(401),
      contenido: documento({ ...parrafo('x'), type: 'table' }),
      urlExterna: 'http://inseguro.test',
      destacada: 'si',
      fechaPublicacion: '2026-11-15T08:00:00',
      otro: 1,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles.map((detalle) => detalle.campo).sort()).toEqual(
      [
        'contenido.bloques.0.type',
        'destacada',
        'fechaPublicacion',
        'otro',
        'resumen',
        'tipo',
        'titulo',
        'urlExterna',
      ].sort(),
    );
  });

  it('el contenido es obligatorio y la expiración debe ser posterior a la publicación', async () => {
    const sinContenido = await como('marketing').post(RUTA, { tipo: 'NOTICIA', titulo: 'Título' });
    expect(sinContenido.status).toBe(400);
    expect(sinContenido.body.error.detalles).toEqual([
      { campo: 'contenido', mensaje: 'Es obligatorio.' },
    ]);

    const fechas = await como('marketing').post(
      RUTA,
      noticia({
        fechaPublicacion: '2026-11-15T08:00:00-04:00',
        fechaExpiracion: '2026-11-15T08:00:00-04:00',
      }),
    );
    expect(fechas.status).toBe(400);
    expect(fechas.body.error.detalles).toEqual([
      { campo: 'fechaExpiracion', mensaje: 'Debe ser posterior a la fecha de publicación.' },
    ]);
  });

  it('referencias inexistentes, de otra sede o de otra clase son 400 en su campo', async () => {
    const respuesta = await como('marketing').post(
      RUTA,
      noticia({
        categoriaId: 999999,
        imagenPortadaId: pdfPropio.id,
        contenido: documento(
          parrafo('Texto'),
          imagenEnContenido(`/media/prueba/no-existe.webp`, 'i1'),
          imagenEnContenido(imagenAjena.url, 'i2'),
          imagenEnContenido('https://otro-sitio.test/foto.webp', 'i3'),
        ),
      }),
    );

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual([
      { campo: 'categoriaId', mensaje: 'La categoría no existe.' },
      { campo: 'imagenPortadaId', mensaje: 'El archivo no es una imagen.' },
      {
        campo: 'contenido.bloques.1.props.url',
        mensaje: 'Debe ser una imagen de la biblioteca multimedia de esta sede.',
      },
      {
        campo: 'contenido.bloques.2.props.url',
        mensaje: 'Debe ser una imagen de la biblioteca multimedia de esta sede.',
      },
      {
        campo: 'contenido.bloques.3.props.url',
        mensaje: 'Debe ser una imagen de la biblioteca multimedia de esta sede.',
      },
    ]);

    const portadaAjena = await como('marketing').post(
      RUTA,
      noticia({ imagenPortadaId: imagenAjena.id }),
    );
    expect(portadaAjena.status).toBe(400);
    expect(portadaAjena.body.error.detalles[0].campo).toBe('imagenPortadaId');
  });

  it('acepta en el contenido las URL del CDN de la biblioteca, también las de una variante', async () => {
    const principal = `https://cdn.ejemplo.test/${imagenCdn.url}`;
    const variante = principal.replace(/\.webp$/, '-960w.webp');
    const creada = await crear(
      'marketing',
      noticia({
        imagenPortadaId: imagenCdn.id,
        contenido: documento(imagenEnContenido(principal, 'a'), imagenEnContenido(variante, 'b')),
      }),
    );

    expect(creada.imagenPortada.url).toBe(principal);
    expect(creada.imagenPortada.variantes.map((v) => v.ancho)).toEqual([480, 960, 1600]);
  });

  it('sede: el Administrador sin sede debe indicarla; los demás roles usan la suya', async () => {
    const sinSede = await como('admin').post(RUTA, noticia());
    expect(sinSede.status).toBe(400);
    expect(sinSede.body.error.detalles).toEqual([{ campo: 'sedeId', mensaje: 'Indica la sede.' }]);

    const inexistente = await como('admin').post(RUTA, noticia({ sedeId: 999999 }));
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.error.detalles).toEqual([
      { campo: 'sedeId', mensaje: 'La sede no existe.' },
    ]);

    const ignorada = await crear('marketing', noticia({ sedeId: sedeAjena.id }));
    expect(ignorada.sede.id).toBe(sede.id);
  });
});

describe('GET /api/admin/publicaciones', () => {
  let propia;
  let ajena;
  let aviso;

  beforeAll(async () => {
    propia = await crear('marketing2', noticia({ titulo: `${PREFIJO} lista Ñoquis solidarios` }));
    aviso = await crear('secretaria', {
      tipo: 'AVISO',
      titulo: `${PREFIJO} lista aviso`,
      contenido: documento(),
    });
    ajena = await crear('secretariaAjena', {
      tipo: 'AVISO',
      titulo: `${PREFIJO} lista ajena`,
      contenido: documento(),
    });
    await ponerEstado(aviso.id, 'Publicado', ', fecha_publicacion = now()');
  });

  const ids = (respuesta) => respuesta.body.datos.map((publicacion) => publicacion.id);

  it('pagina, no incluye el contenido y filtra por tipo, estado, autor y búsqueda', async () => {
    const buscar = encodeURIComponent(`${PREFIJO} lista`);
    const todas = await como('parroco').get(`${RUTA}?buscar=${buscar}`);
    expect(todas.status).toBe(200);
    expect(ids(todas).sort()).toEqual([propia.id, aviso.id].sort());
    expect(todas.body.datos[0]).not.toHaveProperty('contenido');
    expect(todas.body.paginacion).toEqual({ pagina: 1, porPagina: 10, total: 2, totalPaginas: 1 });

    const avisos = await como('parroco').get(`${RUTA}?buscar=${buscar}&tipo=AVISO`);
    expect(ids(avisos)).toEqual([aviso.id]);
    expect(avisos.body.datos[0]).toMatchObject({ visibleEnPortal: true });

    const borradores = await como('parroco').get(`${RUTA}?buscar=${buscar}&estado=BORRADOR`);
    expect(ids(borradores)).toEqual([propia.id]);

    const mias = await como('marketing2').get(`${RUTA}?autor=yo`);
    expect(ids(mias)).toEqual([propia.id]);

    const sinAcentos = await como('parroco').get(`${RUTA}?buscar=noquis%20SOLIDARIOS`);
    expect(ids(sinAcentos)).toEqual([propia.id]);
  });

  it('ordena por título y rechaza un orden o un filtro inválido', async () => {
    const buscar = encodeURIComponent(`${PREFIJO} lista`);
    const porTitulo = await como('parroco').get(`${RUTA}?buscar=${buscar}&orden=titulo`);
    expect(porTitulo.body.datos.map((p) => p.titulo)).toEqual([
      `${PREFIJO} lista aviso`,
      `${PREFIJO} lista Ñoquis solidarios`,
    ]);

    const invalido = await como('parroco').get(`${RUTA}?orden=autor&estado=PENDIENTE&autor=x`);
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.detalles.map((d) => d.campo).sort()).toEqual([
      'query.autor',
      'query.estado.0',
      'query.orden',
    ]);
  });

  it('cada rol ve solo su sede; el Administrador filtra por sede', async () => {
    const buscar = encodeURIComponent(`${PREFIJO} lista`);
    const ajenaVista = await como('secretariaAjena').get(`${RUTA}?buscar=${buscar}`);
    expect(ids(ajenaVista)).toEqual([ajena.id]);

    const otraSede = await como('secretaria').get(`${RUTA}?sede=${sedeAjena.slug}`);
    expect(otraSede.status).toBe(403);

    const admin = await como('admin').get(`${RUTA}?buscar=${buscar}&sede=${sedeAjena.slug}`);
    expect(ids(admin)).toEqual([ajena.id]);
  });

  it('el detalle trae el contenido; 404 si no existe y 403 si es de otra sede', async () => {
    const detalle = await como('secretaria').get(`${RUTA}/${propia.id}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.datos.contenido).toEqual(documento(parrafo('Texto de la noticia.')));
    // Secretaría no redacta noticias: no tiene acciones sobre esta.
    expect(detalle.body.datos.acciones).toEqual([]);

    expect((await como('secretaria').get(`${RUTA}/999999999`)).status).toBe(404);
    const otra = await como('secretaria').get(`${RUTA}/${ajena.id}`);
    expect(otra.status).toBe(403);
    expect(otra.body.error.codigo).toBe('SIN_PERMISO');
    expect((await como('secretaria').get(`${RUTA}/abc`)).status).toBe(400);
  });
});

describe('PATCH /api/admin/publicaciones/:id', () => {
  it('el autor edita su borrador: solo cambian los campos enviados y null borra', async () => {
    const creada = await crear(
      'marketing',
      noticia({ resumen: 'Resumen inicial', categoriaId: 1, destacada: true }),
    );

    const respuesta = await como('marketing').patch(`${RUTA}/${creada.id}`, {
      titulo: `${PREFIJO} título editado`,
      resumen: null,
      destacada: false,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.datos).toMatchObject({
      titulo: `${PREFIJO} título editado`,
      slug: creada.slug,
      resumen: null,
      destacada: false,
      categoria: { id: 1 },
      contenido: creada.contenido,
    });

    const registros = await registrosDe('publicacion', creada.id);
    expect(registros.at(-1)).toEqual({
      usuario_id: usuarios.marketing.id,
      accion: 'UPDATE',
      datos_anteriores: { titulo: creada.titulo, resumen: 'Resumen inicial', destacada: true },
      datos_nuevos: { titulo: `${PREFIJO} título editado`, resumen: null, destacada: false },
    });
  });

  it('slug: null lo genera desde el título; uno repetido es 409', async () => {
    const otra = await crear('marketing', noticia({ slug: `prueba-ocupado-${Date.now()}` }));
    const creada = await crear('marketing', noticia());

    const regenerado = await como('marketing').patch(`${RUTA}/${creada.id}`, {
      titulo: `${PREFIJO} Nuevo título`,
      slug: null,
    });
    expect(regenerado.body.datos.slug).toMatch(/-nuevo-titulo$/);

    const repetido = await como('marketing').patch(`${RUTA}/${creada.id}`, { slug: otra.slug });
    expect(repetido.status).toBe(409);
  });

  it('el tipo y los campos desconocidos no se aceptan', async () => {
    const creada = await crear('marketing', noticia());
    const respuesta = await como('marketing').patch(`${RUTA}/${creada.id}`, {
      tipo: 'AVISO',
      sedeId: 1,
      titulo: null,
    });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles).toEqual(
      expect.arrayContaining([
        { campo: 'tipo', mensaje: 'El tipo no se puede cambiar.' },
        { campo: 'sedeId', mensaje: 'Campo no permitido.' },
        expect.objectContaining({ campo: 'titulo' }),
      ]),
    );
  });

  it('la expiración se compara con la fecha de publicación ya guardada', async () => {
    const creada = await crear(
      'marketing',
      noticia({ fechaPublicacion: '2026-12-01T10:00:00-04:00' }),
    );
    const respuesta = await como('marketing').patch(`${RUTA}/${creada.id}`, {
      fechaExpiracion: '2026-11-30T10:00:00-04:00',
    });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.detalles[0].campo).toBe('fechaExpiracion');
  });

  it('quién edita según el estado (estados-publicacion.md §5)', async () => {
    const creada = await crear('marketing', noticia());
    const editar = (quien) => como(quien).patch(`${RUTA}/${creada.id}`, { destacada: true });

    // Borrador: el autor y el publicador del tipo; otro Marketing no.
    expect((await editar('marketing2')).status).toBe(403);
    expect((await editar('parroco')).status).toBe(200);
    expect((await editar('secretaria')).status).toBe(403);

    // En revisión: solo el publicador.
    await ponerEstado(creada.id, 'En revisión');
    expect((await editar('marketing')).status).toBe(403);
    expect((await editar('parroco')).status).toBe(200);

    // Publicada: el publicador, pero sin cambiar el slug.
    await ponerEstado(creada.id, 'Publicado', ', fecha_publicacion = now()');
    expect((await editar('admin')).status).toBe(200);
    const slug = await como('parroco').patch(`${RUTA}/${creada.id}`, { slug: 'otro-slug-nuevo' });
    expect(slug.status).toBe(409);

    // Archivada: nadie.
    await ponerEstado(creada.id, 'Archivado');
    const archivada = await editar('admin');
    expect(archivada.status).toBe(409);
    expect(archivada.body.error.mensaje).toBe(
      'Una publicación archivada no se puede editar. Primero hay que restaurarla.',
    );
  });

  it('404 si no existe y 403 si es de otra sede', async () => {
    const ajena = await crear('secretariaAjena', {
      tipo: 'AVISO',
      titulo: `${PREFIJO} ajena`,
      contenido: documento(),
    });
    expect((await como('parroco').patch(`${RUTA}/999999999`, { destacada: true })).status).toBe(
      404,
    );
    expect((await como('parroco').patch(`${RUTA}/${ajena.id}`, { destacada: true })).status).toBe(
      403,
    );
  });
});

describe('DELETE /api/admin/publicaciones/:id', () => {
  it('el autor borra su borrador (204 y bitácora); otro Marketing no', async () => {
    const creada = await crear('marketing', noticia());

    expect((await como('marketing2').delete(`${RUTA}/${creada.id}`)).status).toBe(403);
    const respuesta = await como('marketing').delete(`${RUTA}/${creada.id}`);
    expect(respuesta.status).toBe(204);
    expect(respuesta.body).toEqual({});
    expect((await como('marketing').get(`${RUTA}/${creada.id}`)).status).toBe(404);

    const registros = await registrosDe('publicacion', creada.id);
    expect(registros.at(-1)).toMatchObject({
      accion: 'DELETE',
      datos_anteriores: { id: creada.id, titulo: creada.titulo },
      datos_nuevos: null,
    });
  });

  it('en revisión o publicada nadie la borra (409); archivada solo el publicador', async () => {
    const creada = await crear('marketing', noticia());

    await ponerEstado(creada.id, 'En revisión');
    const enRevision = await como('admin').delete(`${RUTA}/${creada.id}`);
    expect(enRevision.status).toBe(409);
    expect(enRevision.body.error.mensaje).toMatch(/Esta está en «En revisión»\.$/);

    await ponerEstado(creada.id, 'Publicado', ', fecha_publicacion = now()');
    expect((await como('parroco').delete(`${RUTA}/${creada.id}`)).status).toBe(409);

    await ponerEstado(creada.id, 'Archivado');
    expect((await como('marketing').delete(`${RUTA}/${creada.id}`)).status).toBe(403);
    expect((await como('parroco').delete(`${RUTA}/${creada.id}`)).status).toBe(204);
  });

  it('un aviso lo borra cualquiera con avisos.gestionar; Marketing no', async () => {
    const aviso = await crear('secretaria', {
      tipo: 'AVISO',
      titulo: `${PREFIJO} aviso a borrar`,
      contenido: documento(),
    });
    expect((await como('marketing').delete(`${RUTA}/${aviso.id}`)).status).toBe(403);
    expect((await como('parroco').delete(`${RUTA}/${aviso.id}`)).status).toBe(204);
  });
});
