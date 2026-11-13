// Controladores HTTP de /api/admin/multimedia.
import { ErrorApp } from '../errores/ErrorApp.js';
import { errorDeZod } from '../middlewares/errores.js';
import { contextoDe } from '../services/bitacora.service.js';
import * as servicio from '../services/multimedia.service.js';
import { cuerpoSubida } from '../validacion/multimedia.js';

export async function subir(req, res) {
  const campos = cuerpoSubida.safeParse(req.body ?? {});
  if (!campos.success) throw errorDeZod(campos.error);

  if (!req.archivoRecibido) {
    throw ErrorApp.validacion(undefined, [{ campo: 'archivo', mensaje: 'Falta el archivo.' }]);
  }

  const datos = await servicio.subirArchivo({
    usuario: req.usuario,
    archivo: req.archivoRecibido,
    textoAlternativo: campos.data.textoAlternativo,
    sedeId: campos.data.sedeId,
    contexto: contextoDe(req),
  });

  res.status(201).set('Location', `/api/admin/multimedia/${datos.id}`).json({ datos });
}
