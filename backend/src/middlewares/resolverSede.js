// Convierte el :sede de la URL (slug) en la sede activa y la deja en req.sede = { id, slug, nombre }.
// Si no existe, está inactiva o el slug no tiene un formato posible: 404 NO_ENCONTRADO.
// Las rutas que cuelgan de /api/sedes/:sede usan req.sede.id y no vuelven a buscarla.
import { resolverSedeActiva } from '../services/sedes.service.js';

export async function resolverSede(req, _res, next) {
  req.sede = await resolverSedeActiva(req.params.sede);
  next();
}
