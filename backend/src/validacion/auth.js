// Esquemas de validación de /api/auth (docs/api/autenticacion.md, sección 2).
import { z } from 'zod';
import '../config/zod.js';
import { contrasenaNueva } from '../utils/contrasenas.js';

// Correo de un usuario: se guarda y se compara en minúsculas, hasta 120 caracteres.
export const correoUsuario = z
  .string({ error: 'Es obligatorio.' })
  .trim()
  .toLowerCase()
  .min(1, 'Es obligatorio.')
  .max(120, 'Debe tener como máximo 120 caracteres.')
  .pipe(z.email({ error: 'Debe ser un correo válido.' }));

export const cuerpoCambiarContrasena = z
  .strictObject({
    contrasenaActual: z
      .string({ error: 'Es obligatoria.' })
      .min(1, 'Es obligatoria.')
      .max(200, 'Debe tener como máximo 200 caracteres.'),
    contrasenaNueva,
  })
  .refine((cuerpo) => cuerpo.contrasenaNueva !== cuerpo.contrasenaActual, {
    path: ['contrasenaNueva'],
    error: 'Debe ser distinta de la contraseña actual.',
  });

export const cuerpoLogin = z.strictObject({
  correo: correoUsuario,
  // Sin recortar espacios: forman parte de la contraseña.
  contrasena: z
    .string({ error: 'Es obligatoria.' })
    .min(1, 'Es obligatoria.')
    .max(200, 'Debe tener como máximo 200 caracteres.'),
});
