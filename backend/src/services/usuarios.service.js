// Lógica de usuarios del panel.
import { z } from 'zod';
import '../config/zod.js';
import { ROLES } from '../constantes/catalogos.js';
import { ErrorApp } from '../errores/ErrorApp.js';
import * as usuarios from '../models/usuarios.model.js';
import { contrasenaNueva, hashearContrasena } from '../utils/contrasenas.js';
import { correoUsuario } from '../validacion/auth.js';

// Código de pg para una restricción UNIQUE violada (usuario.correo).
const VIOLACION_UNICA_PG = '23505';

const esquemaNuevoAdministrador = z.object({
  correo: correoUsuario,
  nombreCompleto: z
    .string({ error: 'Debe ser un texto.' })
    .trim()
    .min(1, 'Es obligatorio.')
    .max(120, 'Debe tener como máximo 120 caracteres.'),
  contrasena: contrasenaNueva,
});

// Crea un usuario con rol Administrador y sin sede (trabaja en todas). Lo usa el script crear-admin.
// Lanza ErrorApp VALIDACION (datos inválidos, con detalles por campo) o CONFLICTO (correo repetido).
export async function crearAdministrador(datos, db) {
  const resultado = esquemaNuevoAdministrador.safeParse(datos);
  if (!resultado.success) {
    throw ErrorApp.validacion(
      'Los datos del administrador no son válidos.',
      resultado.error.issues.map((issue) => ({
        campo: String(issue.path[0] ?? ''),
        mensaje: issue.message,
      })),
    );
  }

  const { correo, nombreCompleto, contrasena } = resultado.data;
  const hashContrasena = await hashearContrasena(contrasena);

  try {
    const usuario = await usuarios.crear(
      {
        rolNombre: ROLES.nombreDe('ADMINISTRADOR'),
        sedeId: null,
        nombreCompleto,
        correo,
        hashContrasena,
      },
      db,
    );
    if (!usuario) throw new Error('El rol Administrador no existe en la base de datos.');
    return { id: usuario.id, correo: usuario.correo, nombreCompleto: usuario.nombre_completo };
  } catch (error) {
    if (error.code === VIOLACION_UNICA_PG) {
      throw ErrorApp.conflicto('Ya existe un usuario con ese correo.', [
        { campo: 'correo', mensaje: 'Ya está registrado.' },
      ]);
    }
    throw error;
  }
}
