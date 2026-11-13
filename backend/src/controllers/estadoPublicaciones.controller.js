// Controladores HTTP de las acciones de estado de /api/admin/publicaciones/:id/<acción>.
import { contextoDe } from '../services/bitacora.service.js';
import { cambiarEstado } from '../services/estadoPublicaciones.service.js';

// Crea el controlador de una acción (ENVIAR_REVISION, APROBAR, ...). Responde 200 con la publicación.
const accion = (nombre) => async (req, res) => {
  const cuerpo = req.validado.body ?? {};
  const datos = await cambiarEstado(
    req.usuario,
    req.validado.params.id,
    nombre,
    cuerpo,
    contextoDe(req),
  );
  res.json({ datos });
};

export const enviarRevision = accion('ENVIAR_REVISION');
export const aprobar = accion('APROBAR');
export const rechazar = accion('RECHAZAR');
export const publicar = accion('PUBLICAR');
export const archivar = accion('ARCHIVAR');
export const restaurar = accion('RESTAURAR');
