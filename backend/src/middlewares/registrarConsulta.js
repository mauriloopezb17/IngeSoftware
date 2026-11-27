// Registra consultas de listados y exportaciones al finalizar la respuesta HTTP.
//
// Regla de clasificación sin listas manuales de URL:
// - Si una ruta usa marcarConsulta('exportacion'), queda marcada explícitamente como exportación.
// - Si no, toda petición GET cuya consulta validada incluye «pagina» (esquema paginacion) se
//   registra automáticamente como «listado» (incluidos los 400 cuando ?pagina o ?porPagina llegan en query).
import { censurarFiltros, obtenerLogger } from '../config/logger.js';

export function marcarConsulta(tipo) {
  return function marcarTipoConsulta(req, _res, next) {
    req.tipoConsulta = tipo;
    next();
  };
}

function resolverTipo(req, res) {
  if (req.tipoConsulta) return req.tipoConsulta;
  if (req.method !== 'GET') return null;

  const queryValidada = req.validado?.query;
  if (queryValidada && Object.hasOwn(queryValidada, 'pagina')) return 'listado';

  if (
    res.statusCode === 400 &&
    req.query &&
    (Object.hasOwn(req.query, 'pagina') || Object.hasOwn(req.query, 'porPagina'))
  ) {
    return 'listado';
  }

  return null;
}

function resolverRuta(req) {
  if (req.route?.path) {
    let base = req.baseUrl ?? '';
    if (base && req.params) {
      const segmentos = base.split('/');
      for (const [clave, valor] of Object.entries(req.params)) {
        if (typeof valor !== 'string' || !valor) continue;
        const idx = segmentos.indexOf(valor);
        if (idx !== -1) segmentos[idx] = `:${clave}`;
      }
      base = segmentos.join('/');
    }
    const sufijo = req.route.path === '/' ? '' : req.route.path;
    return `${base}${sufijo}` || '/';
  }
  return req.originalUrl?.split('?')[0] ?? req.url;
}

function resolverFiltros(req) {
  const enviados = req.query ? Object.keys(req.query) : [];
  if (enviados.length === 0) return {};

  const origen = req.validado?.query ?? req.query;
  const filtros = {};
  for (const clave of enviados) {
    if (Object.hasOwn(origen, clave) && origen[clave] !== undefined) {
      filtros[clave] = origen[clave];
    }
  }
  return censurarFiltros(filtros);
}

export function registrarConsulta(req, res, next) {
  const inicioNs = process.hrtime.bigint();

  res.on('finish', () => {
    const tipo = resolverTipo(req, res);
    if (!tipo) return;

    const duracionMs = Number((Number(process.hrtime.bigint() - inicioNs) / 1e6).toFixed(2));
    const sede = req.sede?.slug ?? req.usuario?.sedeSlug ?? req.usuario?.sedeId;

    const datos = {
      evento: 'consulta',
      tipo,
      ruta: resolverRuta(req),
      filtros: resolverFiltros(req),
      usuario: req.usuario ? { id: req.usuario.id, rol: req.usuario.rol } : 'anonimo',
      estado: res.statusCode,
      duracionMs,
      ...(sede !== undefined && sede !== null ? { sede } : {}),
      ...(req.extraConsulta ?? {}),
      reqId: req.id,
    };

    const log = req.log ?? obtenerLogger();
    if (res.statusCode >= 500) {
      log.error({ ...datos, ...(res.err ? { err: res.err } : {}) }, 'consulta');
    } else if (res.statusCode >= 400) {
      log.warn(datos, 'consulta');
    } else {
      log.info(datos, 'consulta');
    }
  });

  next();
}
