// Acciones de estado de las publicaciones: enviar a revisión, aprobar, rechazar, publicar (o
// programar), archivar y restaurar (docs/api/estados-publicacion.md, secciones 3 y 4).
// Cada acción bloquea la fila, comprueba rol y estado, cambia lo que indica el contrato y registra
// el cambio en la bitácora, todo en una transacción: si dos personas actúan a la vez, la segunda
// espera y ve el estado que dejó la primera (409).
import { ESTADOS_PUBLICACION } from '../constantes/catalogos.js';
import { transaccion } from '../db/index.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import { idDeEstado } from '../models/adminPublicaciones.model.js';
import { actualizarFila } from '../models/comunes.model.js';
import { exigirAccion } from '../utils/accionesPublicacion.js';
import { tieneContenido } from '../validacion/blocknote.js';
import { obtenerPublicacion, publicacionParaModificar } from './adminPublicaciones.service.js';
import { registrarCambio } from './bitacora.service.js';

const ENTIDAD = 'publicacion';

// Fecha efectiva de publicación (estados-publicacion.md §4): la pedida, si no la deseada ya
// guardada, si no ahora; y nunca anterior a ahora.
export function fechaEfectiva(pedida, deseada, ahora) {
  const candidata = pedida ?? deseada;
  if (!candidata) return ahora;
  const fecha = new Date(candidata);
  return fecha < ahora ? ahora : fecha;
}

// Requisitos para salir de BORRADOR. Devuelve los detalles de lo que falta (vacío si está completa).
async function requisitosFaltantes(db, fila, situacion, { efectiva, expiracion, ahora }) {
  const detalles = [];

  if (fila.titulo.trim().length < 3 || fila.titulo.length > 200) {
    detalles.push({ campo: 'titulo', mensaje: 'El título debe tener de 3 a 200 caracteres.' });
  }

  if (situacion.tipo !== 'AVISO' && !tieneContenido(fila.contenido) && !fila.url_externa) {
    detalles.push({
      campo: 'contenido.bloques',
      mensaje: 'Agrega contenido o un enlace externo.',
    });
  }

  if (fila.imagen_portada_id !== null) {
    const { rows } = await db.consultar(
      'SELECT texto_alternativo FROM archivo_multimedia WHERE id = $1',
      [fila.imagen_portada_id],
    );
    if (!rows[0]?.texto_alternativo?.trim()) {
      detalles.push({
        campo: 'imagenPortadaId',
        mensaje: 'La imagen de portada necesita un texto alternativo.',
      });
    }
  }

  if (expiracion && !(new Date(expiracion) > efectiva && new Date(expiracion) > ahora)) {
    detalles.push({
      campo: 'fechaExpiracion',
      mensaje: 'Debe ser posterior a la fecha de publicación y a la fecha actual.',
    });
  }

  return detalles;
}

// Nombre del estado de destino y columnas que cambia cada acción. "ahora": instante de la acción.
const TRANSICIONES = {
  ENVIAR_REVISION: { destino: 'EN_REVISION', exigeCompleta: true },
  APROBAR: { destino: 'PUBLICADO', exigeCompleta: true, publica: true, revisa: true },
  RECHAZAR: { destino: 'BORRADOR', revisa: true },
  PUBLICAR: { destino: 'PUBLICADO', exigeCompleta: true, publica: true },
  ARCHIVAR: { destino: 'ARCHIVADO' },
  RESTAURAR: { destino: 'BORRADOR' },
};

// Ejecuta la acción sobre la publicación y devuelve el objeto actualizado.
// cuerpo: { fechaPublicacion?, fechaExpiracion?, observacion? } ya validado.
export async function cambiarEstado(usuario, id, accion, cuerpo, contexto) {
  const regla = TRANSICIONES[accion];
  if (!regla) throw new TypeError(`Acción de estado desconocida: ${accion}`);

  await transaccion(async (db) => {
    const { fila, situacion } = await publicacionParaModificar(usuario, id, db);
    exigirAccion(accion, situacion, usuario);

    const ahora = new Date();
    const cambios = {
      estado_publicacion_id: await idDeEstado(ESTADOS_PUBLICACION.nombreDe(regla.destino), db),
    };

    // Al enviar a revisión aún no se publica: se valida con la fecha que tendría al publicarse.
    if (regla.exigeCompleta) {
      const efectiva = fechaEfectiva(cuerpo.fechaPublicacion, fila.fecha_publicacion, ahora);
      const expiracion =
        cuerpo.fechaExpiracion !== undefined ? cuerpo.fechaExpiracion : fila.fecha_expiracion;

      const detalles = await requisitosFaltantes(db, fila, situacion, {
        efectiva,
        expiracion,
        ahora,
      });
      if (detalles.length > 0) {
        throw ErrorApp.validacion('La publicación no está lista para publicarse.', detalles);
      }

      if (regla.publica) {
        cambios.fecha_publicacion = efectiva;
        if (cuerpo.fechaExpiracion !== undefined) cambios.fecha_expiracion = cuerpo.fechaExpiracion;
      }
    }

    if (regla.revisa) {
      cambios.revisado_por = usuario.id;
      cambios.fecha_revision = ahora;
      cambios.observacion_revision = accion === 'RECHAZAR' ? cuerpo.observacion : null;
    }

    const nuevo = await actualizarFila(db, ENTIDAD, id, cambios);
    await registrarCambio(db, contexto, {
      entidad: ENTIDAD,
      entidadId: id,
      accion: 'UPDATE',
      anterior: fila,
      nuevo,
    });
  });

  return obtenerPublicacion(usuario, id);
}
