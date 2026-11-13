// Convierte el :sede de la URL (slug) en la sede activa y la deja en req.sede = { id, slug, nombre }.
// Si no existe, está inactiva o el slug no tiene un formato posible: 404 NO_ENCONTRADO.
// Las rutas que cuelgan de /api/sedes/:sede usan req.sede.id y no vuelven a buscarla.
// La búsqueda pasa por la caché (es la consulta que más se repite: una por petición del portal);
// un 404 no se guarda.
import { RECURSOS_CACHE } from '../constantes/cache.js';
import { leerConCache } from '../services/cache.service.js';
import { resolverSedeActiva } from '../services/sedes.service.js';

export async function resolverSede(req, _res, next) {
  const slug = req.params.sede;
  const { valor } = await leerConCache(
    { recurso: RECURSOS_CACHE.SEDES, variante: { resolver: slug }, log: req.log },
    () => resolverSedeActiva(slug),
  );
  req.sede = valor;
  next();
}
