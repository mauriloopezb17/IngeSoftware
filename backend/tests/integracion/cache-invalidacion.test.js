// Invalidación de la caché al modificar contenido desde el panel (ADR-02): por cada recurso, una
// prueba que calienta la lectura pública, modifica por la API del panel y comprueba que el portal
// ve el cambio de inmediato (MISS con el dato nuevo). La caché se activa solo en este archivo.
// Todo se crea en una sede temporal y se borra al final.
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PREFIJO_CACHE } from '../../src/constantes/cache.js';
import { crearPanel } from '../apoyo/panel.js';

vi.stubEnv('CACHE_HABILITADA', 'true');
vi.stubEnv('CDN_PUBLIC_URL', 'https://cdn.ejemplo.test');

const { createApp } = await import('../../src/app.js');
const { consultar, cerrarPool, transaccion } = await import('../../src/db/index.js');
const { cerrarRedis, obtenerRedis } = await import('../../src/db/redis.js');
const { registrarCambio } = await import('../../src/services/bitacora.service.js');
const { invalidacionesDe, RECURSOS_POR_ENTIDAD } =
  await import('../../src/services/invalidacionCache.service.js');

const app = createApp();
const panel = crearPanel(app);
const { como, usuarios } = panel;

let sede;

// Lectura pública de la sede temporal.
const portal = (ruta = '') => request(app).get(`/api/sedes/${sede.slug}${ruta}`);

// Lee dos veces: la segunda debe salir de la caché (la lectura está «caliente»).
async function calentar(ruta) {
  const primera = await portal(ruta);
  const segunda = await portal(ruta);
  expect(primera.status, ruta).toBe(200);
  expect(segunda.headers['x-cache'], `${ruta} debía estar en caché`).toBe('HIT');
  return segunda;
}

// Lee después de un cambio: debe recalcularse desde la base (MISS), no servirse de la caché.
async function leerTrasElCambio(ruta) {
  const respuesta = await portal(ruta);
  expect(respuesta.status, ruta).toBe(200);
  expect(respuesta.headers['x-cache'], `${ruta} debía invalidarse`).toBe('MISS');
  return respuesta;
}

// Hace una modificación por el panel, que debe responder con el estado indicado.
async function modificar(peticion, estado = [200, 201, 204]) {
  const respuesta = await peticion;
  expect(estado, JSON.stringify(respuesta.body)).toContain(respuesta.status);
  return respuesta.body.datos;
}

async function borrarCache() {
  const redis = obtenerRedis();
  const claves = await redis.keys(`${PREFIJO_CACHE}:*`);
  if (claves.length > 0) await redis.del(...claves);
}

const idYoutube = () => randomBytes(9).toString('base64url').slice(0, 11);

beforeAll(async () => {
  sede = await panel.crearSede();
  await panel.conSesion('admin', { rol: 'ADMINISTRADOR', sede: null });
  await panel.conSesion('parroco', { rol: 'PARROCO', sede: sede.slug });
  await borrarCache();
});

afterAll(async () => {
  await borrarCache();
  await panel.limpiar(async () => {
    const porSede = (tabla) => consultar(`DELETE FROM ${tabla} WHERE sede_id = $1`, [sede.id]);
    await consultar(
      'DELETE FROM bloque WHERE pagina_id IN (SELECT id FROM pagina WHERE sede_id = $1)',
      [sede.id],
    );
    await consultar(
      'DELETE FROM proclama_publicacion WHERE proclama_id IN (SELECT id FROM proclama WHERE sede_id = $1)',
      [sede.id],
    );
    for (const tabla of [
      'pagina',
      'proclama',
      'boletin',
      'publicacion',
      'evento',
      'horario',
      'pregunta_frecuente',
      'servicio',
      'grupo_pastoral',
      'video',
      'sede_red_social',
    ]) {
      await porSede(tabla);
    }
  });
  await cerrarPool();
  await cerrarRedis();
});

describe('sedes', () => {
  it('editar la sede (nombre y redes) se ve en su detalle y en la lista de sedes', async () => {
    await calentar('');
    await calentar('/horarios'); // resuelve el slug: la sede queda en caché
    const lista = await request(app).get('/api/sedes');
    expect((await request(app).get('/api/sedes')).headers['x-cache']).toBe('HIT');
    expect(lista.body.datos.find((s) => s.slug === sede.slug).nombre).toBe('Sede de prueba');

    await modificar(
      como('parroco').patch(`/api/admin/sedes/${sede.id}`, {
        nombre: 'Sede renombrada',
        redesSociales: [{ redSocialId: 1, url: 'https://www.facebook.com/prueba' }],
      }),
    );

    const detalle = await leerTrasElCambio('');
    expect(detalle.body.datos.nombre).toBe('Sede renombrada');
    expect(detalle.body.datos.redesSociales).toEqual([
      expect.objectContaining({ url: 'https://www.facebook.com/prueba' }),
    ]);
    const lista2 = await request(app).get('/api/sedes');
    expect(lista2.headers['x-cache']).toBe('MISS');
    expect(lista2.body.datos.find((s) => s.slug === sede.slug).nombre).toBe('Sede renombrada');
  });

  it('desactivar una sede la hace desaparecer del portal de inmediato, y reactivarla la devuelve', async () => {
    await calentar('/horarios');

    await modificar(como('admin').patch(`/api/admin/sedes/${sede.id}`, { activo: false }));
    expect((await portal('/horarios')).status).toBe(404);
    expect((await portal('')).status).toBe(404);

    await modificar(como('admin').patch(`/api/admin/sedes/${sede.id}`, { activo: true }));
    expect((await portal('/horarios')).status).toBe(200);
  });
});

describe('horarios', () => {
  it('crear, editar y eliminar un horario se ve de inmediato', async () => {
    await calentar('/horarios');

    const horario = await modificar(
      como('parroco').post('/api/admin/horarios', {
        tipoHorarioId: 1,
        diaSemana: 3,
        horaInicio: '07:00',
        descripcion: 'Misa de prueba',
      }),
    );
    const filas = (respuesta) => respuesta.body.datos.flatMap((tipo) => tipo.filas);
    let respuesta = await leerTrasElCambio('/horarios');
    expect(filas(respuesta)[0].horarios[0]).toMatchObject({
      horaInicio: '07:00',
      descripcion: 'Misa de prueba',
    });

    await calentar('/horarios');
    await modificar(
      como('parroco').patch(`/api/admin/horarios/${horario.id}`, { horaInicio: '09:30' }),
    );
    respuesta = await leerTrasElCambio('/horarios');
    expect(filas(respuesta)[0].horarios[0].horaInicio).toBe('09:30');

    await calentar('/horarios');
    await modificar(como('parroco').delete(`/api/admin/horarios/${horario.id}`));
    expect((await leerTrasElCambio('/horarios')).body.datos).toEqual([]);
  });

  it('una modificación rechazada (400) no invalida nada', async () => {
    await calentar('/horarios');
    const respuesta = await como('parroco').post('/api/admin/horarios', { diaSemana: 99 });
    expect(respuesta.status).toBe(400);
    expect((await portal('/horarios')).headers['x-cache']).toBe('HIT');
  });
});

describe('servicios y preguntas frecuentes', () => {
  it('crear, editar, agregar una pregunta, reordenar y eliminar se ven de inmediato', async () => {
    await calentar('/servicios');

    const servicio = await modificar(
      como('parroco').post('/api/admin/servicios', {
        nombre: 'Servicio de prueba',
        descripcionCorta: 'Descripción corta',
        contenido: { datos: [] },
      }),
    );
    let lista = await leerTrasElCambio('/servicios');
    expect(lista.body.datos.map((s) => s.nombre)).toEqual(['Servicio de prueba']);

    const ruta = `/servicios/${servicio.slug}`;
    await calentar(ruta);
    await modificar(
      como('parroco').patch(`/api/admin/servicios/${servicio.id}`, { nombre: 'Nombre nuevo' }),
    );
    expect((await leerTrasElCambio(ruta)).body.datos.nombre).toBe('Nombre nuevo');

    await calentar(ruta);
    await modificar(
      como('parroco').post(`/api/admin/servicios/${servicio.id}/preguntas-frecuentes`, {
        pregunta: '¿Cuánto cuesta?',
        respuesta: 'Es gratuito.',
        activa: true,
      }),
    );
    expect(
      (await leerTrasElCambio(ruta)).body.datos.preguntasFrecuentes.map((p) => p.pregunta),
    ).toEqual(['¿Cuánto cuesta?']);

    // Reordenar con dos servicios (con uno solo no cambia nada y no hay qué invalidar).
    const segundo = await modificar(
      como('parroco').post('/api/admin/servicios', {
        nombre: 'Segundo servicio',
        descripcionCorta: 'Otra descripción',
        contenido: { datos: [] },
      }),
    );
    await calentar('/servicios');
    await modificar(
      como('parroco').post('/api/admin/servicios/reordenar', { ids: [segundo.id, servicio.id] }),
    );
    expect((await leerTrasElCambio('/servicios')).body.datos.map((s) => s.nombre)).toEqual([
      'Segundo servicio',
      'Nombre nuevo',
    ]);
    await modificar(como('parroco').delete(`/api/admin/servicios/${segundo.id}`));

    await calentar('/servicios');
    await modificar(como('parroco').delete(`/api/admin/servicios/${servicio.id}`));
    lista = await leerTrasElCambio('/servicios');
    expect(lista.body.datos).toEqual([]);
  });
});

describe('grupos pastorales', () => {
  it('crear, editar y eliminar un grupo se ve de inmediato', async () => {
    await calentar('/grupos-pastorales');

    const grupo = await modificar(
      como('parroco').post('/api/admin/grupos-pastorales', {
        nombre: 'Grupo de prueba',
        horarioReunion: 'Viernes · 18:30',
        icono: 'users',
      }),
    );
    expect((await leerTrasElCambio('/grupos-pastorales')).body.datos.map((g) => g.nombre)).toEqual([
      'Grupo de prueba',
    ]);

    await calentar('/grupos-pastorales');
    await modificar(
      como('parroco').patch(`/api/admin/grupos-pastorales/${grupo.id}`, { nombre: 'Otro nombre' }),
    );
    expect((await leerTrasElCambio('/grupos-pastorales')).body.datos[0].nombre).toBe('Otro nombre');

    await calentar('/grupos-pastorales');
    await modificar(como('parroco').delete(`/api/admin/grupos-pastorales/${grupo.id}`));
    expect((await leerTrasElCambio('/grupos-pastorales')).body.datos).toEqual([]);
  });
});

describe('videos', () => {
  it('crear, editar y eliminar un video se ve de inmediato', async () => {
    await calentar('/videos');

    const video = await modificar(
      como('parroco').post('/api/admin/videos', {
        youtube: idYoutube(),
        titulo: 'Video de prueba',
      }),
    );
    expect((await leerTrasElCambio('/videos')).body.datos.map((v) => v.titulo)).toEqual([
      'Video de prueba',
    ]);

    await calentar('/videos');
    await modificar(
      como('parroco').patch(`/api/admin/videos/${video.id}`, { titulo: 'Título nuevo' }),
    );
    expect((await leerTrasElCambio('/videos')).body.datos[0].titulo).toBe('Título nuevo');

    await calentar('/videos');
    await modificar(como('parroco').delete(`/api/admin/videos/${video.id}`));
    expect((await leerTrasElCambio('/videos')).body.datos).toEqual([]);
  });
});

describe('publicaciones', () => {
  const contenido = {
    formato: 'blocknote',
    version: 1,
    bloques: [
      {
        id: 'p1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Texto.', styles: {} }],
        children: [],
      },
    ],
  };
  const titulos = (respuesta) => respuesta.body.datos.map((p) => p.titulo);

  it('publicar, editar y archivar una publicación se ve de inmediato (lista y detalle)', async () => {
    await calentar('/publicaciones');

    const creada = await modificar(
      como('parroco').post('/api/admin/publicaciones', {
        tipo: 'AVISO',
        titulo: 'Aviso de prueba',
        contenido,
      }),
    );
    // Un borrador no aparece en el portal: nada que invalidar a la vista, pero la lista sigue correcta.
    expect(titulos(await portal('/publicaciones'))).toEqual([]);

    await calentar('/publicaciones');
    await modificar(como('parroco').post(`/api/admin/publicaciones/${creada.id}/publicar`, {}));
    expect(titulos(await leerTrasElCambio('/publicaciones'))).toEqual(['Aviso de prueba']);

    const detalle = `/publicaciones/${creada.slug}`;
    await calentar(detalle);
    await modificar(
      como('parroco').patch(`/api/admin/publicaciones/${creada.id}`, { titulo: 'Aviso editado' }),
    );
    expect((await leerTrasElCambio(detalle)).body.datos.titulo).toBe('Aviso editado');
    expect(titulos(await leerTrasElCambio('/publicaciones'))).toEqual(['Aviso editado']);

    await calentar(detalle);
    await calentar('/publicaciones');
    await modificar(como('parroco').post(`/api/admin/publicaciones/${creada.id}/archivar`, {}));
    expect((await portal(detalle)).status).toBe(404);
    expect(titulos(await leerTrasElCambio('/publicaciones'))).toEqual([]);

    // Una publicación archivada se puede eliminar.
    await modificar(como('parroco').delete(`/api/admin/publicaciones/${creada.id}`));
  });
});

describe('eventos', () => {
  it('crear, editar y eliminar un evento se ve de inmediato', async () => {
    await calentar('/eventos');

    const evento = await modificar(
      como('parroco').post('/api/admin/eventos', {
        titulo: 'Evento de prueba',
        fechaInicio: '2031-11-22T10:00:00-04:00',
        categoriaEventoId: 1,
      }),
    );
    expect((await leerTrasElCambio('/eventos')).body.datos.map((e) => e.titulo)).toEqual([
      'Evento de prueba',
    ]);

    await calentar('/eventos');
    await modificar(
      como('parroco').patch(`/api/admin/eventos/${evento.id}`, { estado: 'ARCHIVADO' }),
    );
    expect((await leerTrasElCambio('/eventos')).body.datos).toEqual([]);

    await modificar(
      como('parroco').patch(`/api/admin/eventos/${evento.id}`, { estado: 'PUBLICADO' }),
    );
    await calentar('/eventos');
    await modificar(como('parroco').delete(`/api/admin/eventos/${evento.id}`));
    expect((await leerTrasElCambio('/eventos')).body.datos).toEqual([]);
  });
});

describe('proclamas', () => {
  it('crear, agregar una publicación y eliminar una proclama se ve de inmediato', async () => {
    await calentar('/proclamas');
    await calentar('/proclamas/historial');

    const proclama = await modificar(
      como('parroco').post('/api/admin/proclamas', {
        contrayente1: 'Luis Prueba',
        contrayente2: 'Andrea Prueba',
        fechaMatrimonio: '2032-12-05T12:00:00-04:00',
      }),
    );
    // Sin publicaciones alcanzadas todavía no es pública.
    expect((await portal('/proclamas')).body.datos).toEqual([]);

    await calentar('/proclamas');
    await calentar('/proclamas/historial');
    await modificar(
      como('parroco').post(`/api/admin/proclamas/${proclama.id}/publicaciones`, {
        fecha: '2020-10-25',
      }),
    );
    const vigentes = await leerTrasElCambio('/proclamas');
    expect(vigentes.body.datos.map((p) => p.contrayente1)).toEqual(['Luis Prueba']);
    expect((await leerTrasElCambio('/proclamas/historial')).body.datos).toHaveLength(1);

    await calentar('/proclamas');
    await modificar(
      como('parroco').patch(`/api/admin/proclamas/${proclama.id}`, {
        contrayente1: 'Luis Editado',
      }),
    );
    expect((await leerTrasElCambio('/proclamas')).body.datos[0].contrayente1).toBe('Luis Editado');

    await calentar('/proclamas');
    await modificar(como('parroco').delete(`/api/admin/proclamas/${proclama.id}/publicaciones/1`));
    expect((await leerTrasElCambio('/proclamas')).body.datos).toEqual([]);
  });
});

describe('boletines', () => {
  it('publicar, editar y eliminar un boletín se ve de inmediato', async () => {
    const pdf = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: usuarios.parroco.id,
      tipoMime: 'application/pdf',
      clave: `sedes/${sede.slug}/2026/11/8f3c2a1d-5b7e-4c90-a1f4-${String(Date.now()).slice(-12)}.pdf`,
    });
    await calentar('/boletines');

    const boletin = await modificar(
      como('parroco').post('/api/admin/boletines', {
        titulo: 'Boletín de prueba',
        periodo: '2026-11',
        archivoId: pdf.id,
      }),
    );
    expect((await leerTrasElCambio('/boletines')).body.datos.map((b) => b.titulo)).toEqual([
      'Boletín de prueba',
    ]);

    await calentar('/boletines');
    await modificar(
      como('parroco').patch(`/api/admin/boletines/${boletin.id}`, { titulo: 'Boletín editado' }),
    );
    expect((await leerTrasElCambio('/boletines')).body.datos[0].titulo).toBe('Boletín editado');

    await calentar('/boletines');
    await modificar(como('parroco').delete(`/api/admin/boletines/${boletin.id}`));
    expect((await leerTrasElCambio('/boletines')).body.datos).toEqual([]);
  });
});

describe('páginas y bloques', () => {
  it('publicar una página, agregar, ocultar, reordenar y eliminar bloques se ve de inmediato', async () => {
    await calentar('/paginas');

    const pagina = await modificar(
      como('parroco').post('/api/admin/paginas', {
        slug: 'historia',
        titulo: 'Nuestra historia',
        mostrarEnMenu: true,
        estado: 'PUBLICADO',
      }),
    );
    expect((await leerTrasElCambio('/paginas')).body.datos.map((p) => p.slug)).toEqual([
      'historia',
    ]);

    const ruta = '/paginas/historia';
    await calentar(ruta);
    const uno = await modificar(
      como('parroco').post(`/api/admin/paginas/${pagina.id}/bloques`, {
        tipo: 'cita',
        contenido: { texto: 'Primera' },
      }),
    );
    expect((await leerTrasElCambio(ruta)).body.datos.bloques.map((b) => b.contenido.texto)).toEqual(
      ['Primera'],
    );

    const dos = await modificar(
      como('parroco').post(`/api/admin/paginas/${pagina.id}/bloques`, {
        tipo: 'cita',
        contenido: { texto: 'Segunda' },
      }),
    );
    await calentar(ruta);
    await modificar(
      como('parroco').post(`/api/admin/paginas/${pagina.id}/bloques/reordenar`, {
        ids: [dos.id, uno.id],
      }),
    );
    expect((await leerTrasElCambio(ruta)).body.datos.bloques.map((b) => b.contenido.texto)).toEqual(
      ['Segunda', 'Primera'],
    );

    await calentar(ruta);
    await modificar(
      como('parroco').patch(`/api/admin/paginas/${pagina.id}/bloques/${dos.id}`, {
        visible: false,
      }),
    );
    expect((await leerTrasElCambio(ruta)).body.datos.bloques.map((b) => b.contenido.texto)).toEqual(
      ['Primera'],
    );

    await calentar(ruta);
    await modificar(
      como('parroco').patch(`/api/admin/paginas/${pagina.id}/bloques/${uno.id}`, {
        contenido: { texto: 'Editada' },
      }),
    );
    expect((await leerTrasElCambio(ruta)).body.datos.bloques[0].contenido.texto).toBe('Editada');

    await calentar(ruta);
    await modificar(como('parroco').delete(`/api/admin/paginas/${pagina.id}/bloques/${uno.id}`));
    expect((await leerTrasElCambio(ruta)).body.datos.bloques).toEqual([]);

    await calentar(ruta);
    await modificar(
      como('parroco').patch(`/api/admin/paginas/${pagina.id}`, { estado: 'ARCHIVADO' }),
    );
    expect((await portal(ruta)).status).toBe(404);
    expect((await leerTrasElCambio('/paginas')).body.datos).toEqual([]);
  });
});

describe('multimedia', () => {
  it('cambiar el texto alternativo de una imagen se ve en las publicaciones que la usan', async () => {
    const imagen = await panel.crearArchivo({
      sedeId: sede.id,
      subidoPor: usuarios.parroco.id,
      tipoMime: 'image/webp',
      textoAlternativo: 'Texto inicial',
      clave: `sedes/${sede.slug}/2026/11/0b1e9c2a-7d3f-4e8a-9c61-${String(Date.now()).slice(-12)}.webp`,
      ancho: 400,
    });
    const aviso = await modificar(
      como('parroco').post('/api/admin/publicaciones', {
        tipo: 'AVISO',
        titulo: 'Aviso con imagen',
        imagenPortadaId: imagen.id,
        contenido: { formato: 'blocknote', version: 1, bloques: [] },
      }),
    );
    await modificar(como('parroco').post(`/api/admin/publicaciones/${aviso.id}/publicar`, {}));

    const lista = await calentar('/publicaciones');
    expect(lista.body.datos[0].imagenPortada.textoAlternativo).toBe('Texto inicial');

    await modificar(
      como('parroco').patch(`/api/admin/multimedia/${imagen.id}`, {
        textoAlternativo: 'Texto nuevo',
      }),
    );
    const nueva = await leerTrasElCambio('/publicaciones');
    expect(nueva.body.datos[0].imagenPortada.textoAlternativo).toBe('Texto nuevo');
  });
});

describe('lo que no se ve en el portal', () => {
  it('crear o editar un usuario no invalida nada', async () => {
    await calentar('/horarios');
    await calentar('/eventos');

    const nuevo = await modificar(
      como('admin').post('/api/admin/usuarios', {
        nombreCompleto: 'Usuario de prueba de caché',
        correo: `prueba-cache-${Date.now()}@parroquia.test`,
        rol: 'SECRETARIA',
        sedeId: sede.id,
        contrasena: 'Clave-Segura-2026-prueba',
      }),
    );
    await modificar(
      como('admin').patch(`/api/admin/usuarios/${nuevo.id}`, { nombreCompleto: 'Otro nombre' }),
    );

    expect((await portal('/horarios')).headers['x-cache']).toBe('HIT');
    expect((await portal('/eventos')).headers['x-cache']).toBe('HIT');

    await consultar('DELETE FROM bitacora_cambio WHERE entidad = $1 AND entidad_id = $2', [
      'usuario',
      String(nuevo.id),
    ]);
    await consultar('DELETE FROM usuario WHERE id = $1', [nuevo.id]);
  });
});

describe('la invalidación espera a la transacción', () => {
  it('si la transacción se deshace, no se invalida; al confirmarse, sí', async () => {
    await calentar('/horarios');

    await expect(
      transaccion(async (db) => {
        await registrarCambio(
          db,
          { usuarioId: null, ip: null },
          {
            entidad: 'horario',
            entidadId: 1,
            accion: 'INSERT',
            nuevo: { id: 1, sede_id: sede.id },
          },
        );
        throw new Error('se deshace');
      }),
    ).rejects.toThrow('se deshace');
    expect((await portal('/horarios')).headers['x-cache']).toBe('HIT');

    await transaccion(async (db) => {
      await registrarCambio(
        db,
        { usuarioId: null, ip: null },
        {
          entidad: 'horario',
          entidadId: 1,
          accion: 'INSERT',
          nuevo: { id: 1, sede_id: sede.id },
        },
      );
      // Todavía dentro de la transacción: la caché sigue intacta.
      expect((await portal('/horarios')).headers['x-cache']).toBe('HIT');
    });
    expect((await portal('/horarios')).headers['x-cache']).toBe('MISS');

    await consultar(
      "DELETE FROM bitacora_cambio WHERE entidad = 'horario' AND entidad_id = '1' AND usuario_id IS NULL",
    );
  });
});

describe('tabla de recursos por entidad', () => {
  it('cada entidad invalida solo sus recursos', () => {
    expect(invalidacionesDe('horario', null, { id: 1, sede_id: 7 })).toEqual([
      { sedeId: 7, recursos: ['horarios'] },
    ]);
    expect(invalidacionesDe('sede', { id: 3 }, { id: 3 })).toEqual([
      { sedeId: 3, recursos: ['sede'] },
      { sedeId: null, recursos: ['sedes'] },
    ]);
  });

  it('un cambio de sede invalida la sede anterior y la nueva', () => {
    expect(
      invalidacionesDe('publicacion', { sede_id: 1 }, { sede_id: 2 }).map((i) => i.sedeId),
    ).toEqual([1, 2]);
  });

  it('los usuarios no invalidan nada', () => {
    expect(invalidacionesDe('usuario', null, { id: 1, sede_id: 1 })).toEqual([]);
  });

  it('una entidad desconocida invalida todo lo de su sede y lo global', () => {
    const lista = invalidacionesDe('entidad_nueva', null, { id: 1, sede_id: 5 });
    expect(lista.map((i) => i.sedeId)).toEqual([5, null]);
    expect(lista[0].recursos).toEqual(expect.arrayContaining(['horarios', 'paginas', 'sedes']));
    expect(RECURSOS_POR_ENTIDAD.entidad_nueva).toBeUndefined();
  });
});
