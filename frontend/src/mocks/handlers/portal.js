import { http, HttpResponse } from 'msw';

import { api } from '../api.js';
import {
  sedesLista,
  sedesDetalle,
  menuPaginasExaltacion,
  paginasExaltacion,
} from '../datos/sedes.js';
import {
  horariosExaltacion,
  serviciosExaltacion,
  gruposPastoralesExaltacion,
  boletinesExaltacion,
  videosExaltacion,
} from '../datos/parroquia.js';
import {
  categoriasPublicacion,
  categoriasEvento,
  obtenerEventosExaltacion,
  obtenerPublicacionesExaltacion,
  obtenerProclamasExaltacion,
  obtenerHistorialProclamasExaltacion,
  obtenerDetalleProclamaExaltacion,
} from '../datos/comunidad.js';

const SEDE_PRINCIPAL = 'senor-de-la-exaltacion';

function errorJson(status, codigo, mensaje, detalles = []) {
  return HttpResponse.json({ error: { codigo, mensaje, detalles } }, { status });
}

function validarSede(sedeSlug) {
  if (!sedesDetalle[sedeSlug]) {
    return errorJson(404, 'NO_ENCONTRADO', `No existe la sede «${sedeSlug}».`);
  }
  return null;
}

function normalizar(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function paginar(lista, url) {
  const paginaParam = Number(url.searchParams.get('pagina') ?? 1);
  const porPaginaParam = Number(url.searchParams.get('porPagina') ?? 10);

  if (!Number.isInteger(paginaParam) || paginaParam < 1) {
    return {
      error: errorJson(400, 'VALIDACION', 'Los parámetros de consulta no son válidos.', [
        { campo: 'query.pagina', mensaje: 'Debe ser un entero mayor o igual a 1.' },
      ]),
    };
  }

  if (!Number.isInteger(porPaginaParam) || porPaginaParam < 1 || porPaginaParam > 50) {
    return {
      error: errorJson(400, 'VALIDACION', 'Los parámetros de consulta no son válidos.', [
        { campo: 'query.porPagina', mensaje: 'Debe ser un entero entre 1 y 50.' },
      ]),
    };
  }

  const total = lista.length;
  const totalPaginas = total === 0 ? 0 : Math.ceil(total / porPaginaParam);
  const inicio = (paginaParam - 1) * porPaginaParam;

  return {
    respuesta: HttpResponse.json({
      datos: lista.slice(inicio, inicio + porPaginaParam),
      paginacion: {
        pagina: paginaParam,
        porPagina: porPaginaParam,
        total,
        totalPaginas,
      },
    }),
  };
}

function omitirCampos(objeto, campos) {
  return Object.fromEntries(
    Object.entries(objeto).filter(([clave]) => !campos.includes(clave)),
  );
}

function esSedePrincipal(sede) {
  return sede === SEDE_PRINCIPAL;
}

// Handlers del portal público (Sección B). Copian los ejemplos de docs/api/publico.md.
export const handlersPortal = [
  http.get(api('/sedes'), () => HttpResponse.json({ datos: sedesLista })),

  http.get(api('/sedes/:sede'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    return HttpResponse.json({ datos: sedesDetalle[params.sede] });
  }),

  http.get(api('/sedes/:sede/horarios'), ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    if (!esSedePrincipal(params.sede)) {
      return HttpResponse.json({ datos: [] });
    }

    const url = new URL(request.url);
    const tipoParam = url.searchParams.get('tipo');
    let datos = horariosExaltacion;

    if (tipoParam) {
      const ids = tipoParam.split(',').map((valor) => Number(valor.trim()));
      datos = datos.filter((grupo) => ids.includes(grupo.tipo.id));
    }

    return HttpResponse.json({ datos });
  }),

  http.get(api('/sedes/:sede/servicios'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    if (!esSedePrincipal(params.sede)) {
      return HttpResponse.json({ datos: [] });
    }

    const datos = serviciosExaltacion.map((servicio) =>
      omitirCampos(servicio, ['contenido', 'preguntasFrecuentes']),
    );
    return HttpResponse.json({ datos });
  }),

  http.get(api('/sedes/:sede/servicios/:slug'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const servicio = esSedePrincipal(params.sede)
      ? serviciosExaltacion.find((item) => item.slug === params.slug)
      : null;

    if (!servicio) {
      return errorJson(404, 'NO_ENCONTRADO', `No existe el servicio «${params.slug}».`);
    }

    return HttpResponse.json({ datos: servicio });
  }),

  http.get(api('/sedes/:sede/grupos-pastorales'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    return HttpResponse.json({
      datos: esSedePrincipal(params.sede) ? gruposPastoralesExaltacion : [],
    });
  }),

  http.get(api('/sedes/:sede/eventos'), ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const url = new URL(request.url);
    const ahoraMs = Date.now();
    const hoyBolivia = new Date(ahoraMs - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);

    let lista = esSedePrincipal(params.sede)
      ? obtenerEventosExaltacion().filter((evento) => {
          if (evento.fechaFin) {
            return new Date(evento.fechaFin).getTime() > ahoraMs;
          }
          const finDia = new Date(`${evento.fechaInicio.slice(0, 10)}T23:59:59-04:00`).getTime();
          return finDia > ahoraMs;
        })
      : [];

    const categoria = url.searchParams.get('categoria');
    if (categoria) {
      const ids = categoria.split(',').map((valor) => Number(valor.trim()));
      lista = lista.filter((evento) => ids.includes(evento.categoria?.id));
    }

    const desdeParam = url.searchParams.get('desde');
    const desde = desdeParam && desdeParam > hoyBolivia ? desdeParam : hoyBolivia;
    lista = lista.filter((evento) => (evento.fechaFin ?? evento.fechaInicio).slice(0, 10) >= desde);

    const hasta = url.searchParams.get('hasta');
    if (hasta) {
      lista = lista.filter((evento) => evento.fechaInicio.slice(0, 10) <= hasta);
    }

    lista = [...lista]
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
      .map((evento) => ({
        ...omitirCampos(evento, ['detalle']),
        tieneDetalle: Boolean(evento.tieneDetalle),
      }));

    const resultado = paginar(lista, url);
    return resultado.error ?? resultado.respuesta;
  }),

  http.get(api('/sedes/:sede/eventos/:id'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const id = Number(params.id);
    const evento =
      Number.isInteger(id) && id > 0 && esSedePrincipal(params.sede)
        ? obtenerEventosExaltacion().find((item) => item.id === id)
        : null;

    if (!evento) {
      return errorJson(404, 'NO_ENCONTRADO', `No existe el evento «${params.id}».`);
    }

    return HttpResponse.json({
      datos: {
        ...evento,
        tieneDetalle: Boolean(evento.tieneDetalle),
        detalle: evento.detalle ?? null,
      },
    });
  }),

  http.get(api('/sedes/:sede/publicaciones'), ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const url = new URL(request.url);
    let lista = esSedePrincipal(params.sede) ? obtenerPublicacionesExaltacion() : [];

    const tipo = url.searchParams.get('tipo');
    if (tipo) {
      const tipos = tipo.split(',').map((valor) => valor.trim());
      lista = lista.filter((item) => tipos.includes(item.tipo.codigo));
    }

    const categoria = url.searchParams.get('categoria');
    if (categoria) {
      lista = lista.filter((item) => item.categoria?.slug === categoria);
    }

    const destacada = url.searchParams.get('destacada');
    if (destacada === 'true' || destacada === 'false') {
      const esperada = destacada === 'true';
      lista = lista.filter((item) => item.destacada === esperada);
    }

    const buscar = url.searchParams.get('buscar');
    if (buscar) {
      const termino = normalizar(buscar);
      lista = lista.filter((item) =>
        normalizar(`${item.titulo} ${item.resumen ?? ''}`).includes(termino),
      );
    }

    const orden = url.searchParams.get('orden') ?? '-fechaPublicacion';
    lista = [...lista].sort((a, b) => {
      const comparacion = a.fechaPublicacion.localeCompare(b.fechaPublicacion);
      return orden === 'fechaPublicacion' ? comparacion : -comparacion;
    });

    const resumen = lista.map((item) => omitirCampos(item, ['contenido']));
    const resultado = paginar(resumen, url);
    return resultado.error ?? resultado.respuesta;
  }),

  http.get(api('/sedes/:sede/publicaciones/:slug'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const publicacion = esSedePrincipal(params.sede)
      ? obtenerPublicacionesExaltacion().find((item) => item.slug === params.slug)
      : null;

    if (!publicacion) {
      return errorJson(404, 'NO_ENCONTRADO', `No existe la publicación «${params.slug}».`);
    }

    return HttpResponse.json({ datos: publicacion });
  }),

  http.get(api('/sedes/:sede/proclamas/historial'), ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const url = new URL(request.url);
    let lista = esSedePrincipal(params.sede)
      ? [...obtenerHistorialProclamasExaltacion()].sort((a, b) =>
          b.fechaMatrimonio.localeCompare(a.fechaMatrimonio),
        )
      : [];

    const anio = url.searchParams.get('anio');
    if (anio) {
      lista = lista.filter((item) => item.fechaMatrimonio.startsWith(`${anio}-`));
    }

    const resultado = paginar(lista, url);
    return resultado.error ?? resultado.respuesta;
  }),

  http.get(api('/sedes/:sede/proclamas'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    return HttpResponse.json({
      datos: esSedePrincipal(params.sede) ? obtenerProclamasExaltacion() : [],
    });
  }),

  http.get(api('/sedes/:sede/proclamas/:id'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const detalle = esSedePrincipal(params.sede) ? obtenerDetalleProclamaExaltacion(params.id) : null;
    if (!detalle) {
      return HttpResponse.json(
        { error: { codigo: 'NO_ENCONTRADO', mensaje: 'La proclama no existe.', detalles: [] } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ datos: detalle });
  }),

  http.get(api('/sedes/:sede/proclamas/:id/observaciones/verificacion'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const detalle = esSedePrincipal(params.sede) ? obtenerDetalleProclamaExaltacion(params.id) : null;
    if (!detalle) {
      return HttpResponse.json(
        { error: { codigo: 'NO_ENCONTRADO', mensaje: 'La proclama no existe.', detalles: [] } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ datos: { token: `mock.${params.id}.firma` } });
  }),

  http.post(api('/sedes/:sede/proclamas/:id/observaciones'), async ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const detalle = esSedePrincipal(params.sede) ? obtenerDetalleProclamaExaltacion(params.id) : null;
    if (!detalle) {
      return HttpResponse.json(
        { error: { codigo: 'NO_ENCONTRADO', mensaje: 'La proclama no existe.', detalles: [] } },
        { status: 404 },
      );
    }
    if (!detalle.aceptaObservaciones) {
      return HttpResponse.json(
        { error: { codigo: 'CONFLICTO', mensaje: 'Esta proclama ya no recibe observaciones.', detalles: [] } },
        { status: 409 },
      );
    }

    const cuerpo = await request.json().catch(() => null);
    if (!cuerpo || typeof cuerpo !== 'object') {
      return HttpResponse.json(
        { error: { codigo: 'VALIDACION', mensaje: 'Cuerpo inválido.', detalles: [] } },
        { status: 400 },
      );
    }
    if (!cuerpo.verificacion?.trim()) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'VALIDACION',
            mensaje: 'Los datos enviados no son válidos.',
            detalles: [
              {
                campo: 'verificacion',
                mensaje: 'No pudimos verificar el envío. Vuelve a cargar la página e inténtalo de nuevo.',
              },
            ],
          },
        },
        { status: 400 },
      );
    }
    if (!cuerpo.correo?.trim() && !cuerpo.telefono?.trim()) {
      return HttpResponse.json(
        {
          error: {
            codigo: 'VALIDACION',
            mensaje: 'Los datos enviados no son válidos.',
            detalles: [
              {
                campo: 'contacto',
                mensaje: 'Escribe tu correo o tu teléfono para que el párroco pueda responderte.',
              },
            ],
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ datos: { recibido: true } }, { status: 201 });
  }),

  http.get(api('/sedes/:sede/boletines'), ({ params, request }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const url = new URL(request.url);
    let lista = esSedePrincipal(params.sede) ? boletinesExaltacion : [];

    const anio = url.searchParams.get('anio');
    if (anio) {
      lista = lista.filter((item) => item.periodo.startsWith(`${anio}-`));
    }

    const resultado = paginar(lista, url);
    return resultado.error ?? resultado.respuesta;
  }),

  http.get(api('/sedes/:sede/videos'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    return HttpResponse.json({
      datos: esSedePrincipal(params.sede) ? videosExaltacion : [],
    });
  }),

  http.get(api('/sedes/:sede/paginas'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    return HttpResponse.json({
      datos: esSedePrincipal(params.sede) ? menuPaginasExaltacion : [],
    });
  }),

  http.get(api('/sedes/:sede/paginas/:slug'), ({ params }) => {
    const fallo = validarSede(params.sede);
    if (fallo) return fallo;

    const pagina = esSedePrincipal(params.sede) ? paginasExaltacion[params.slug] : null;
    if (!pagina) {
      return errorJson(404, 'NO_ENCONTRADO', `No existe la página «${params.slug}».`);
    }

    return HttpResponse.json({ datos: pagina });
  }),

  http.get(api('/categorias'), () => HttpResponse.json({ datos: categoriasPublicacion })),

  http.get(api('/categorias-evento'), () => HttpResponse.json({ datos: categoriasEvento })),
];
