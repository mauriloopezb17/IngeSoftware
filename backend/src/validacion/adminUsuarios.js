// Validación de usuarios del panel CMS (docs/api/admin.md, sección 14).
import { z } from 'zod';
import '../config/zod.js';
import { ROLES } from '../constantes/catalogos.js';
import { contrasenaNueva } from '../utils/contrasenas.js';
import { correoUsuario } from './auth.js';
import { booleanoQuery, esquemaListado, id, listaCodigos, slug } from './comunes.js';

const ENTERO_MAXIMO_PG = 2_147_483_647;

const idEntero = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

const nombreCompleto = z
  .string()
  .trim()
  .min(1, 'El nombre completo es obligatorio.')
  .max(120, 'El nombre completo puede tener hasta 120 caracteres.');

const rolCodigo = z.enum(ROLES.codigos, {
  error: `Debe ser uno de: ${ROLES.codigos.join(', ')}.`,
});

export const paramsUsuario = z.object({ id });

export const consultaUsuarios = esquemaListado({
  conBuscar: true,
  filtros: {
    rol: listaCodigos(ROLES.codigos).optional(),
    sede: slug.optional(),
    activo: booleanoQuery.optional(),
  },
  ordenes: ['nombreCompleto', '-nombreCompleto'],
  ordenPredeterminado: 'nombreCompleto',
});

const listaGrupoIds = z
  .array(idEntero, { error: 'Debe ser una lista de identificadores.' })
  .max(50, 'Se aceptan hasta 50 grupos.')
  .transform((lista) => [...new Set(lista)]);

export const cuerpoCrearUsuario = z.strictObject({
  nombreCompleto,
  correo: correoUsuario,
  rol: rolCodigo,
  sedeId: idEntero.nullable().optional().default(null),
  contrasena: contrasenaNueva,
  activo: z.boolean().optional().default(true),
  grupoIds: listaGrupoIds.optional(),
});

export const cuerpoEditarUsuario = z.strictObject({
  nombreCompleto: nombreCompleto.optional(),
  correo: correoUsuario.optional(),
  rol: rolCodigo.optional(),
  sedeId: idEntero.nullable().optional(),
  activo: z.boolean().optional(),
  grupoIds: listaGrupoIds.optional(),
});

export const cuerpoRestablecerContrasena = z.strictObject({
  contrasenaNueva,
});
