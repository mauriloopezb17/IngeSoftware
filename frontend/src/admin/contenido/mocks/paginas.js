// Datos iniciales y handlers MSW de páginas y bloques (docs/api/admin.md §12, docs/api/contenido.md).
import { http, HttpResponse } from 'msw';

import { api } from '../../../mocks/api.js';
import { paginasExaltacion } from '../../../mocks/datos/sedes.js';
import { SEDE_PRINCIPAL } from '../../mocks/usuarios.js';
import { CATALOGOS } from './datos.js';

const ADMIN_SEED = { id: 1, nombreCompleto: 'Administrador (desarrollo)' };
const SECRETARIA_SEED = { id: 3, nombreCompleto: 'Secretaría (desarrollo)' };

const ESTADOS_PAGINA = {
  BORRADOR: { codigo: 'BORRADOR', nombre: 'Borrador' },
  PUBLICADO: { codigo: 'PUBLICADO', nombre: 'Publicado' },
  ARCHIVADO: { codigo: 'ARCHIVADO', nombre: 'Archivado' },
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REGEX_YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

const esUrlPortal = (valor) =>
  typeof valor === 'string' && (valor.startsWith('https://') || valor.startsWith('/media/'));

const esEnlaceValido = (valor) =>
  typeof valor === 'string' &&
  (valor.startsWith('#') || valor.startsWith('/') || valor.startsWith('https://'));

function validarTexto(valor, { campo, etiqueta, obligatorio = false, max }, detalles) {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) detalles.push({ campo, mensaje: `${etiqueta} es obligatorio.` });
    return;
  }
  if (typeof valor !== 'string') {
    detalles.push({ campo, mensaje: `${etiqueta} debe ser texto.` });
    return;
  }
  const limpio = valor.trim();
  if (obligatorio && !limpio) {
    detalles.push({ campo, mensaje: `${etiqueta} es obligatorio.` });
    return;
  }
  if (max && limpio.length > max) {
    detalles.push({ campo, mensaje: `${etiqueta} admite hasta ${max} caracteres.` });
  }
}

function validarClavesPermitidas(objeto, permitidas, prefijo, detalles) {
  for (const clave of Object.keys(objeto)) {
    if (!permitidas.has(clave)) {
      detalles.push({
        campo: `${prefijo}.${clave}`,
        mensaje: `La propiedad «${clave}» no está permitida en este bloque.`,
      });
    }
  }
}

export function validarContenidoBloque(tipo, contenido) {
  const detalles = [];
  if (!CATALOGOS.tiposBloque.some((t) => t.codigo === tipo)) {
    return [{ campo: 'tipo', mensaje: 'El tipo de bloque no es válido.' }];
  }
  if (!contenido || typeof contenido !== 'object' || Array.isArray(contenido)) {
    return [{ campo: 'contenido', mensaje: 'El contenido del bloque debe ser un objeto.' }];
  }

  if (tipo === 'hero_video') {
    validarClavesPermitidas(
      contenido,
      new Set(['titulo', 'subtitulo', 'etiqueta', 'url_video', 'url_poster', 'texto_video', 'detalle_video', 'botones']),
      'contenido',
      detalles,
    );
    validarTexto(contenido.titulo, { campo: 'contenido.titulo', etiqueta: 'El título', obligatorio: true, max: 80 }, detalles);
    validarTexto(contenido.subtitulo, { campo: 'contenido.subtitulo', etiqueta: 'El subtítulo', max: 300 }, detalles);
    validarTexto(contenido.etiqueta, { campo: 'contenido.etiqueta', etiqueta: 'La etiqueta', max: 80 }, detalles);
    if (!esUrlPortal(contenido.url_video)) {
      detalles.push({ campo: 'contenido.url_video', mensaje: 'El video debe ser una URL https:// o /media/.' });
    }
    if (contenido.url_poster !== undefined && !esUrlPortal(contenido.url_poster)) {
      detalles.push({ campo: 'contenido.url_poster', mensaje: 'El póster debe ser una URL https:// o /media/.' });
    }
    validarTexto(contenido.texto_video, { campo: 'contenido.texto_video', etiqueta: 'El título del botón de video', max: 60 }, detalles);
    validarTexto(contenido.detalle_video, { campo: 'contenido.detalle_video', etiqueta: 'El detalle del video', max: 60 }, detalles);

    if (contenido.botones !== undefined) {
      if (!Array.isArray(contenido.botones) || contenido.botones.length > 3) {
        detalles.push({ campo: 'contenido.botones', mensaje: 'Puedes incluir entre 0 y 3 botones.' });
      } else {
        contenido.botones.forEach((boton, i) => {
          if (!boton || typeof boton !== 'object' || Array.isArray(boton)) {
            detalles.push({ campo: `contenido.botones.${i}`, mensaje: 'Cada botón debe ser un objeto.' });
            return;
          }
          validarClavesPermitidas(boton, new Set(['texto', 'enlace']), `contenido.botones.${i}`, detalles);
          validarTexto(boton.texto, { campo: `contenido.botones.${i}.texto`, etiqueta: 'El texto del botón', obligatorio: true, max: 40 }, detalles);
          if (!esEnlaceValido(boton.enlace)) {
            detalles.push({
              campo: `contenido.botones.${i}.enlace`,
              mensaje: 'El enlace debe empezar con #, / o https://.',
            });
          }
        });
      }
    }
  } else if (tipo === 'texto_imagen') {
    validarClavesPermitidas(
      contenido,
      new Set(['titulo', 'texto', 'etiqueta', 'url_imagen', 'texto_alternativo', 'posicion_imagen', 'tarjeta']),
      'contenido',
      detalles,
    );
    validarTexto(contenido.titulo, { campo: 'contenido.titulo', etiqueta: 'El título', obligatorio: true, max: 120 }, detalles);
    validarTexto(contenido.texto, { campo: 'contenido.texto', etiqueta: 'El texto', obligatorio: true, max: 3000 }, detalles);
    validarTexto(contenido.etiqueta, { campo: 'contenido.etiqueta', etiqueta: 'La etiqueta', max: 80 }, detalles);
    if (contenido.url_imagen !== undefined && !esUrlPortal(contenido.url_imagen)) {
      detalles.push({ campo: 'contenido.url_imagen', mensaje: 'La imagen debe ser una URL https:// o /media/.' });
    }
    validarTexto(contenido.texto_alternativo, { campo: 'contenido.texto_alternativo', etiqueta: 'El texto alternativo', max: 255 }, detalles);
    if (contenido.posicion_imagen !== undefined && contenido.posicion_imagen !== 'izquierda' && contenido.posicion_imagen !== 'derecha') {
      detalles.push({ campo: 'contenido.posicion_imagen', mensaje: 'La posición debe ser «izquierda» o «derecha».' });
    }
    if (contenido.tarjeta !== undefined) {
      if (!contenido.tarjeta || typeof contenido.tarjeta !== 'object' || Array.isArray(contenido.tarjeta)) {
        detalles.push({ campo: 'contenido.tarjeta', mensaje: 'La tarjeta debe ser un objeto.' });
      } else {
        validarClavesPermitidas(contenido.tarjeta, new Set(['etiqueta', 'titulo', 'descripcion']), 'contenido.tarjeta', detalles);
        validarTexto(contenido.tarjeta.titulo, { campo: 'contenido.tarjeta.titulo', etiqueta: 'El título de la tarjeta', obligatorio: true, max: 80 }, detalles);
        validarTexto(contenido.tarjeta.etiqueta, { campo: 'contenido.tarjeta.etiqueta', etiqueta: 'La etiqueta de la tarjeta', max: 60 }, detalles);
        validarTexto(contenido.tarjeta.descripcion, { campo: 'contenido.tarjeta.descripcion', etiqueta: 'La descripción de la tarjeta', max: 200 }, detalles);
      }
    }
  } else if (tipo === 'tarjetas') {
    validarClavesPermitidas(contenido, new Set(['titulo', 'items']), 'contenido', detalles);
    validarTexto(contenido.titulo, { campo: 'contenido.titulo', etiqueta: 'El título de la grilla', max: 120 }, detalles);
    if (!Array.isArray(contenido.items) || contenido.items.length < 1 || contenido.items.length > 12) {
      detalles.push({ campo: 'contenido.items', mensaje: 'Debes incluir entre 1 y 12 tarjetas.' });
    } else {
      contenido.items.forEach((item, i) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          detalles.push({ campo: `contenido.items.${i}`, mensaje: 'Cada tarjeta debe ser un objeto.' });
          return;
        }
        validarClavesPermitidas(
          item,
          new Set(['titulo', 'subtitulo', 'icono', 'url_imagen', 'texto_alternativo', 'enlace']),
          `contenido.items.${i}`,
          detalles,
        );
        validarTexto(item.titulo, { campo: `contenido.items.${i}.titulo`, etiqueta: 'El título', obligatorio: true, max: 80 }, detalles);
        validarTexto(item.subtitulo, { campo: `contenido.items.${i}.subtitulo`, etiqueta: 'El subtítulo', max: 300 }, detalles);
        validarTexto(item.texto_alternativo, { campo: `contenido.items.${i}.texto_alternativo`, etiqueta: 'El texto alternativo', max: 255 }, detalles);
        if (item.url_imagen !== undefined && !esUrlPortal(item.url_imagen)) {
          detalles.push({ campo: `contenido.items.${i}.url_imagen`, mensaje: 'La imagen debe ser una URL https:// o /media/.' });
        }
        if (item.enlace !== undefined && !esEnlaceValido(item.enlace)) {
          detalles.push({ campo: `contenido.items.${i}.enlace`, mensaje: 'El enlace debe empezar con #, / o https://.' });
        }
      });
    }
  } else if (tipo === 'cita') {
    validarClavesPermitidas(contenido, new Set(['texto', 'autor']), 'contenido', detalles);
    validarTexto(contenido.texto, { campo: 'contenido.texto', etiqueta: 'El texto de la cita', obligatorio: true, max: 400 }, detalles);
    validarTexto(contenido.autor, { campo: 'contenido.autor', etiqueta: 'El autor', max: 120 }, detalles);
  } else if (tipo === 'galeria') {
    validarClavesPermitidas(contenido, new Set(['titulo', 'imagenes']), 'contenido', detalles);
    validarTexto(contenido.titulo, { campo: 'contenido.titulo', etiqueta: 'El título de la galería', max: 120 }, detalles);
    if (!Array.isArray(contenido.imagenes) || contenido.imagenes.length < 1 || contenido.imagenes.length > 30) {
      detalles.push({ campo: 'contenido.imagenes', mensaje: 'Debes incluir entre 1 y 30 imágenes.' });
    } else {
      contenido.imagenes.forEach((img, i) => {
        if (!img || typeof img !== 'object' || Array.isArray(img)) {
          detalles.push({ campo: `contenido.imagenes.${i}`, mensaje: 'Cada imagen debe ser un objeto.' });
          return;
        }
        validarClavesPermitidas(img, new Set(['url', 'texto_alternativo', 'leyenda']), `contenido.imagenes.${i}`, detalles);
        if (!esUrlPortal(img.url)) {
          detalles.push({ campo: `contenido.imagenes.${i}.url`, mensaje: 'La URL de la imagen es obligatoria y debe ser https:// o /media/.' });
        }
        validarTexto(
          img.texto_alternativo,
          { campo: `contenido.imagenes.${i}.texto_alternativo`, etiqueta: 'El texto alternativo', obligatorio: true, max: 255 },
          detalles,
        );
        validarTexto(img.leyenda, { campo: `contenido.imagenes.${i}.leyenda`, etiqueta: 'La leyenda', max: 200 }, detalles);
      });
    }
  } else if (tipo === 'video_youtube') {
    validarClavesPermitidas(contenido, new Set(['youtube_video_id', 'titulo']), 'contenido', detalles);
    if (typeof contenido.youtube_video_id !== 'string' || !REGEX_YOUTUBE_ID.test(contenido.youtube_video_id.trim())) {
      detalles.push({ campo: 'contenido.youtube_video_id', mensaje: 'El identificador de YouTube debe tener 11 caracteres válidos.' });
    }
    validarTexto(contenido.titulo, { campo: 'contenido.titulo', etiqueta: 'El título del video', max: 160 }, detalles);
  }

  return detalles;
}

function clonarBloques(bloques, fechaActualizacion) {
  return bloques.map((b) => ({
    ...structuredClone(b),
    visible: b.visible ?? true,
    fechaActualizacion,
  }));
}

export function crearPaginasIniciales() {
  return [
    {
      id: paginasExaltacion.inicio.id,
      sede: SEDE_PRINCIPAL,
      estado: ESTADOS_PAGINA.PUBLICADO,
      slug: paginasExaltacion.inicio.slug,
      titulo: paginasExaltacion.inicio.titulo,
      descripcionSeo: paginasExaltacion.inicio.descripcionSeo,
      paginaPadre: null,
      mostrarEnMenu: true,
      ordenMenu: 0,
      creadoPor: ADMIN_SEED,
      actualizadoPor: ADMIN_SEED,
      fechaCreacion: '2026-10-26T10:10:00-04:00',
      fechaActualizacion: '2026-11-01T09:00:00-04:00',
      bloques: clonarBloques(paginasExaltacion.inicio.bloques, '2026-11-01T09:00:00-04:00'),
    },
    {
      id: paginasExaltacion.nosotros.id,
      sede: SEDE_PRINCIPAL,
      estado: ESTADOS_PAGINA.PUBLICADO,
      slug: paginasExaltacion.nosotros.slug,
      titulo: paginasExaltacion.nosotros.titulo,
      descripcionSeo: 'Comunidad parroquial confiada a los Padres Pasionistas en Obrajes, La Paz.',
      paginaPadre: null,
      mostrarEnMenu: true,
      ordenMenu: 1,
      creadoPor: ADMIN_SEED,
      actualizadoPor: SECRETARIA_SEED,
      fechaCreacion: '2026-10-26T10:12:37-04:00',
      fechaActualizacion: '2026-11-02T16:20:00-04:00',
      bloques: clonarBloques(paginasExaltacion.nosotros.bloques, '2026-11-02T16:20:00-04:00'),
    },
    {
      id: 3,
      sede: SEDE_PRINCIPAL,
      estado: ESTADOS_PAGINA.BORRADOR,
      slug: 'historia',
      titulo: 'Nuestra historia',
      descripcionSeo: 'Historia de la presencia pasionista en Obrajes.',
      paginaPadre: { id: 2, slug: 'nosotros', titulo: 'Quiénes somos' },
      mostrarEnMenu: false,
      ordenMenu: 2,
      creadoPor: SECRETARIA_SEED,
      actualizadoPor: SECRETARIA_SEED,
      fechaCreacion: '2026-11-03T11:00:00-04:00',
      fechaActualizacion: '2026-11-03T11:00:00-04:00',
      bloques: [
        {
          id: 6,
          tipo: 'cita',
          orden: 1,
          visible: false,
          contenido: {
            texto: 'Desde 1957 acompañamos a la comunidad de Obrajes en torno a la Cruz.',
            autor: 'Crónica parroquial',
          },
          fechaActualizacion: '2026-11-03T11:00:00-04:00',
        },
      ],
    },
  ];
}

function resumenLista(pagina) {
  const copia = { ...pagina };
  delete copia.bloques;
  return copia;
}

function resumenUsuario(usuario) {
  return { id: usuario.id, nombreCompleto: usuario.nombreCompleto };
}

function tieneCicloPadre(paginas, paginaId, candidatoPadreId) {
  let actualId = candidatoPadreId;
  const visitados = new Set([paginaId]);
  while (actualId) {
    if (visitados.has(actualId)) return true;
    visitados.add(actualId);
    const nodo = paginas.find((p) => p.id === actualId);
    actualId = nodo?.paginaPadre?.id ?? null;
  }
  return false;
}

export function crearControladorPaginas(ctx) {
  let paginas = crearPaginasIniciales();
  let sigPaginaId = 4;
  let sigBloqueId = 7;

  function reiniciar() {
    paginas = crearPaginasIniciales();
    sigPaginaId = 4;
    sigBloqueId = 7;
  }

  const handlers = [
    http.get(api('/admin/paginas'), ({ request }) => {
      const auth = ctx.autenticar();
      if (auth.respuesta) return auth.respuesta;

      const { slugSede, parametros, respuesta } = ctx.resolverSedeFiltro(request, auth.usuario);
      if (respuesta) return respuesta;

      const estado = parametros.get('estado');
      if (estado && !ESTADOS_PAGINA[estado]) {
        return ctx.errorValidacion([{ campo: 'estado', mensaje: 'El estado indicado no es válido.' }]);
      }

      const filtradas = paginas
        .filter((p) => (!slugSede || p.sede.slug === slugSede) && (!estado || p.estado.codigo === estado))
        .sort((a, b) => a.ordenMenu - b.ordenMenu || a.titulo.localeCompare(b.titulo, 'es'))
        .map(resumenLista);

      return HttpResponse.json({ datos: filtradas });
    }),

    http.get(api('/admin/paginas/:id'), ({ params }) => {
      const auth = ctx.autenticar();
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      return HttpResponse.json({
        datos: {
          ...recurso,
          bloques: [...recurso.bloques].sort((a, b) => a.orden - b.orden),
        },
      });
    }),

    http.post(api('/admin/paginas'), async ({ request }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const { sede, respuesta } = ctx.resolverSedeCreacion(cuerpo, auth.usuario);
      if (respuesta) return respuesta;

      const detalles = [];
      const titulo = typeof cuerpo.titulo === 'string' ? cuerpo.titulo.trim() : '';
      if (!titulo || titulo.length > 120) {
        detalles.push({ campo: 'titulo', mensaje: 'El título es obligatorio y admite hasta 120 caracteres.' });
      }

      const slugBruto = typeof cuerpo.slug === 'string' && cuerpo.slug.trim() ? cuerpo.slug.trim() : ctx.aSlug(titulo);
      if (!slugBruto || slugBruto.length > 100 || !SLUG_REGEX.test(slugBruto)) {
        detalles.push({
          campo: 'slug',
          mensaje: 'El slug debe contener solo letras minúsculas, números y guiones.',
        });
      }

      const codigoEstado = cuerpo.estado ?? 'BORRADOR';
      const estadoObj = ESTADOS_PAGINA[codigoEstado];
      if (!estadoObj) {
        detalles.push({ campo: 'estado', mensaje: 'El estado debe ser BORRADOR, PUBLICADO o ARCHIVADO.' });
      }

      const descripcionSeo = typeof cuerpo.descripcionSeo === 'string' ? cuerpo.descripcionSeo.trim() : '';
      if (descripcionSeo.length > 300) {
        detalles.push({ campo: 'descripcionSeo', mensaje: 'La descripción SEO admite hasta 300 caracteres.' });
      }

      let paginaPadre = null;
      if (cuerpo.paginaPadreId !== undefined && cuerpo.paginaPadreId !== null && cuerpo.paginaPadreId !== '') {
        const padre = paginas.find((p) => p.id === Number(cuerpo.paginaPadreId) && p.sede.id === sede.id);
        if (!padre) {
          detalles.push({ campo: 'paginaPadreId', mensaje: 'La página padre indicada no existe en la sede.' });
        } else {
          paginaPadre = { id: padre.id, slug: padre.slug, titulo: padre.titulo };
        }
      }

      const ordenMenu = cuerpo.ordenMenu !== undefined ? Number(cuerpo.ordenMenu) : 0;
      if (!Number.isInteger(ordenMenu) || ordenMenu < 0) {
        detalles.push({ campo: 'ordenMenu', mensaje: 'El orden del menú debe ser un número entero mayor o igual a 0.' });
      }

      if (detalles.length) return ctx.errorValidacion(detalles);

      if (paginas.some((p) => p.sede.id === sede.id && p.slug === slugBruto)) {
        return ctx.error(409, 'CONFLICTO', `Ya existe una página con el slug «${slugBruto}» en esta sede.`);
      }

      const ahora = new Date().toISOString();
      const actor = resumenUsuario(auth.usuario);
      const nueva = {
        id: sigPaginaId++,
        sede,
        estado: estadoObj,
        slug: slugBruto,
        titulo,
        descripcionSeo: descripcionSeo || null,
        paginaPadre,
        mostrarEnMenu: Boolean(cuerpo.mostrarEnMenu),
        ordenMenu,
        creadoPor: actor,
        actualizadoPor: actor,
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        bloques: [],
      };
      paginas.push(nueva);

      return HttpResponse.json(
        { datos: nueva },
        { status: 201, headers: { Location: `/api/admin/paginas/${nueva.id}` } },
      );
    }),

    http.patch(api('/admin/paginas/:id'), async ({ request, params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const detalles = [];
      const titulo = cuerpo.titulo !== undefined ? String(cuerpo.titulo ?? '').trim() : recurso.titulo;
      if (!titulo || titulo.length > 120) {
        detalles.push({ campo: 'titulo', mensaje: 'El título es obligatorio y admite hasta 120 caracteres.' });
      }

      const slug = cuerpo.slug !== undefined ? String(cuerpo.slug ?? '').trim() : recurso.slug;
      if (!slug || slug.length > 100 || !SLUG_REGEX.test(slug)) {
        detalles.push({
          campo: 'slug',
          mensaje: 'El slug debe contener solo letras minúsculas, números y guiones.',
        });
      }

      const estadoObj = cuerpo.estado !== undefined ? ESTADOS_PAGINA[cuerpo.estado] : recurso.estado;
      if (!estadoObj) {
        detalles.push({ campo: 'estado', mensaje: 'El estado debe ser BORRADOR, PUBLICADO o ARCHIVADO.' });
      }

      let descripcionSeo = recurso.descripcionSeo;
      if (cuerpo.descripcionSeo !== undefined) {
        const desc = typeof cuerpo.descripcionSeo === 'string' ? cuerpo.descripcionSeo.trim() : '';
        if (desc.length > 300) {
          detalles.push({ campo: 'descripcionSeo', mensaje: 'La descripción SEO admite hasta 300 caracteres.' });
        }
        descripcionSeo = desc || null;
      }

      let paginaPadre = recurso.paginaPadre;
      if (cuerpo.paginaPadreId !== undefined) {
        if (cuerpo.paginaPadreId === null || cuerpo.paginaPadreId === '') {
          paginaPadre = null;
        } else {
          const padreId = Number(cuerpo.paginaPadreId);
          const padre = paginas.find((p) => p.id === padreId && p.sede.id === recurso.sede.id);
          if (!padre) {
            detalles.push({ campo: 'paginaPadreId', mensaje: 'La página padre indicada no existe en la sede.' });
          } else if (tieneCicloPadre(paginas, recurso.id, padreId)) {
            detalles.push({ campo: 'paginaPadreId', mensaje: 'Una página no puede depender de sí misma ni de una subpágina suya.' });
          } else {
            paginaPadre = { id: padre.id, slug: padre.slug, titulo: padre.titulo };
          }
        }
      }

      const ordenMenu = cuerpo.ordenMenu !== undefined ? Number(cuerpo.ordenMenu) : recurso.ordenMenu;
      if (!Number.isInteger(ordenMenu) || ordenMenu < 0) {
        detalles.push({ campo: 'ordenMenu', mensaje: 'El orden del menú debe ser un número entero mayor o igual a 0.' });
      }

      if (detalles.length) return ctx.errorValidacion(detalles);

      if (paginas.some((p) => p.id !== recurso.id && p.sede.id === recurso.sede.id && p.slug === slug)) {
        return ctx.error(409, 'CONFLICTO', `Ya existe una página con el slug «${slug}» en esta sede.`);
      }

      recurso.titulo = titulo;
      recurso.slug = slug;
      recurso.estado = estadoObj;
      recurso.descripcionSeo = descripcionSeo;
      recurso.paginaPadre = paginaPadre;
      if (cuerpo.mostrarEnMenu !== undefined) recurso.mostrarEnMenu = Boolean(cuerpo.mostrarEnMenu);
      recurso.ordenMenu = ordenMenu;
      recurso.actualizadoPor = resumenUsuario(auth.usuario);
      recurso.fechaActualizacion = new Date().toISOString();

      for (const hija of paginas) {
        if (hija.paginaPadre?.id === recurso.id) {
          hija.paginaPadre = { id: recurso.id, slug: recurso.slug, titulo: recurso.titulo };
        }
      }

      return HttpResponse.json({ datos: recurso });
    }),

    http.delete(api('/admin/paginas/:id'), ({ params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      if (recurso.slug === 'inicio' || recurso.slug === 'nosotros') {
        return ctx.error(
          409,
          'CONFLICTO',
          `La página «${recurso.slug}» no se puede eliminar porque el portal depende de ella.`,
        );
      }

      if (paginas.some((p) => p.paginaPadre?.id === recurso.id)) {
        return ctx.error(
          409,
          'CONFLICTO',
          'No se puede eliminar esta página porque tiene páginas hijas asociadas.',
        );
      }

      paginas = paginas.filter((p) => p.id !== recurso.id);
      return new HttpResponse(null, { status: 204 });
    }),

    http.post(api('/admin/paginas/:id/bloques'), async ({ request, params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const detalles = validarContenidoBloque(cuerpo.tipo, cuerpo.contenido);
      if (detalles.length) {
        return ctx.error(400, 'VALIDACION', 'El contenido del bloque no es válido.', detalles);
      }

      const maxOrden = recurso.bloques.reduce((max, b) => Math.max(max, b.orden), 0);
      const ahora = new Date().toISOString();
      const nuevo = {
        id: sigBloqueId++,
        tipo: cuerpo.tipo,
        orden: maxOrden + 1,
        visible: cuerpo.visible !== undefined ? Boolean(cuerpo.visible) : true,
        contenido: structuredClone(cuerpo.contenido),
        fechaActualizacion: ahora,
      };
      recurso.bloques.push(nuevo);
      recurso.actualizadoPor = resumenUsuario(auth.usuario);
      recurso.fechaActualizacion = ahora;

      return HttpResponse.json(
        { datos: nuevo },
        { status: 201, headers: { Location: `/api/admin/paginas/${recurso.id}/bloques/${nuevo.id}` } },
      );
    }),

    http.post(api('/admin/paginas/:id/bloques/reordenar'), async ({ request, params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      const cuerpo = await request.json().catch(() => null);
      const fallo = ctx.validarReorden(recurso.bloques, cuerpo?.ids);
      if (fallo) return fallo;

      const mapaOrden = new Map(cuerpo.ids.map((id, indice) => [Number(id), indice + 1]));
      for (const bloque of recurso.bloques) {
        bloque.orden = mapaOrden.get(bloque.id);
      }
      recurso.bloques.sort((a, b) => a.orden - b.orden);
      recurso.actualizadoPor = resumenUsuario(auth.usuario);
      recurso.fechaActualizacion = new Date().toISOString();

      return HttpResponse.json({ datos: recurso.bloques });
    }),

    http.patch(api('/admin/paginas/:id/bloques/:bloqueId'), async ({ request, params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      const bloque = recurso.bloques.find((b) => b.id === Number(params.bloqueId));
      if (!bloque) return ctx.error(404, 'NO_ENCONTRADO', 'El bloque no existe.');

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      if (cuerpo.tipo !== undefined && cuerpo.tipo !== bloque.tipo) {
        return ctx.errorValidacion([{ campo: 'tipo', mensaje: 'No se puede cambiar el tipo de un bloque existente.' }]);
      }

      if (cuerpo.contenido !== undefined) {
        const detalles = validarContenidoBloque(bloque.tipo, cuerpo.contenido);
        if (detalles.length) {
          return ctx.error(400, 'VALIDACION', 'El contenido del bloque no es válido.', detalles);
        }
        bloque.contenido = structuredClone(cuerpo.contenido);
      }

      if (cuerpo.visible !== undefined) {
        bloque.visible = Boolean(cuerpo.visible);
      }

      const ahora = new Date().toISOString();
      bloque.fechaActualizacion = ahora;
      recurso.actualizadoPor = resumenUsuario(auth.usuario);
      recurso.fechaActualizacion = ahora;

      return HttpResponse.json({ datos: bloque });
    }),

    http.delete(api('/admin/paginas/:id/bloques/:bloqueId'), ({ params }) => {
      const auth = ctx.autenticar('paginas.gestionar', 'Tu rol no tiene permiso para gestionar páginas.');
      if (auth.respuesta) return auth.respuesta;

      const { recurso, respuesta } = ctx.leerPorId(paginas, params.id, auth.usuario, 'La página no existe.');
      if (respuesta) return respuesta;

      const bloque = recurso.bloques.find((b) => b.id === Number(params.bloqueId));
      if (!bloque) return ctx.error(404, 'NO_ENCONTRADO', 'El bloque no existe.');

      recurso.bloques = recurso.bloques.filter((b) => b.id !== bloque.id);
      recurso.actualizadoPor = resumenUsuario(auth.usuario);
      recurso.fechaActualizacion = new Date().toISOString();

      return new HttpResponse(null, { status: 204 });
    }),
  ];

  return { handlers, reiniciar };
}
