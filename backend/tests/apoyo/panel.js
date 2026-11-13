// Apoyo para las pruebas de los endpoints del panel (/api/admin/...): sesiones de usuarios de
// prueba, una sede ajena temporal y archivos de biblioteca temporales. Todo lo que se crea aquí se
// borra con limpiar(); los registros del seed solo se leen.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { consultar } from '../../src/db/index.js';
import { borrarUsuariosDePrueba, crearUsuarioDePrueba, SEDE_PRINCIPAL } from './usuarios.js';
import { limpiarContadoresDeIntentos } from './limite.js';

export { SEDE_PRINCIPAL };

export async function iniciarSesion(app, usuario) {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ correo: usuario.correo, contrasena: usuario.contrasena });
  return respuesta.headers['set-cookie'][0].split(';')[0];
}

// Id y slug de la sede principal del seed (solo lectura).
export async function sedePrincipal() {
  const { rows } = await consultar('SELECT id, slug FROM sede WHERE slug = $1', [SEDE_PRINCIPAL]);
  return rows[0];
}

// Id de un archivo del seed por su URL (ej. '/media/seed/altar.webp'). Solo lectura.
export async function archivoDelSeed(url) {
  const { rows } = await consultar('SELECT id, url FROM archivo_multimedia WHERE url = $1', [url]);
  return rows[0];
}

export function crearPanel(app) {
  const sesiones = {};
  const usuarios = {};
  const sedesCreadas = [];
  const archivosCreados = [];

  // Peticiones con la cookie del usuario "quien" (sin "quien": sin sesión).
  const como = (quien) => {
    const conCookie = (peticion) => (quien ? peticion.set('Cookie', sesiones[quien]) : peticion);
    return {
      get: (ruta) => conCookie(request(app).get(ruta)),
      post: (ruta, cuerpo) => conCookie(request(app).post(ruta)).send(cuerpo),
      patch: (ruta, cuerpo) => conCookie(request(app).patch(ruta)).send(cuerpo),
      delete: (ruta) => conCookie(request(app).delete(ruta)),
    };
  };

  return {
    sesiones,
    usuarios,
    como,

    // Crea un usuario de prueba con su sesión. opciones: { rol, sede (slug o null) }.
    async conSesion(nombre, opciones) {
      usuarios[nombre] = await crearUsuarioDePrueba(opciones);
      sesiones[nombre] = await iniciarSesion(app, usuarios[nombre]);
      return usuarios[nombre];
    },

    // Sede temporal activa, para crear recursos en ella. Devuelve { id, slug }.
    async crearSede() {
      const { rows } = await consultar(
        `INSERT INTO sede (tipo_sede_id, nombre, slug)
         VALUES ((SELECT id FROM tipo_sede ORDER BY id LIMIT 1), 'Sede de prueba', $1)
         RETURNING id, slug`,
        [`prueba-${randomUUID()}`.slice(0, 40)],
      );
      sedesCreadas.push(rows[0].id);
      return rows[0];
    },

    // Archivo temporal de la biblioteca, sin subirlo al almacenamiento (solo la fila).
    // clave: lo que se guarda en "url" (ej. 'sedes/x/2026/11/<uuid>.webp' o '/media/prueba/x.pdf').
    async crearArchivo({
      sedeId,
      subidoPor,
      tipoMime,
      clave,
      textoAlternativo = null,
      ancho = null,
    }) {
      const { rows } = await consultar(
        `INSERT INTO archivo_multimedia
           (sede_id, subido_por, nombre_original, url, tipo_mime, tamano_bytes, ancho_px, alto_px, texto_alternativo)
         VALUES ($1, $2, $3, $4, $5, 1000, $6, $6, $7)
         RETURNING id, url`,
        [
          sedeId,
          subidoPor,
          `prueba-${randomUUID()}`,
          clave ?? `/media/prueba/${randomUUID()}`,
          tipoMime,
          ancho,
          textoAlternativo,
        ],
      );
      archivosCreados.push(rows[0].id);
      return rows[0];
    },

    // Borra lo creado: primero lo que llamó "borrar" (los recursos que dependen de los usuarios,
    // las sedes y los archivos), después archivos, usuarios y sedes.
    async limpiar(borrar = async () => {}) {
      await borrar();
      await consultar('DELETE FROM archivo_multimedia WHERE id = ANY($1)', [archivosCreados]);
      await borrarUsuariosDePrueba();
      await consultar('DELETE FROM sede WHERE id = ANY($1)', [sedesCreadas]);
      await limpiarContadoresDeIntentos();
    },
  };
}

// Registros de bitácora de un recurso, del más antiguo al más nuevo.
export async function registrosDe(entidad, entidadId) {
  const { rows } = await consultar(
    `SELECT usuario_id, accion, datos_anteriores, datos_nuevos
       FROM bitacora_cambio WHERE entidad = $1 AND entidad_id = $2 ORDER BY id`,
    [entidad, String(entidadId)],
  );
  return rows;
}
