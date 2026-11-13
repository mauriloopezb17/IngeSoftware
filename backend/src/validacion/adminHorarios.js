// Validación de horarios en el panel CMS (contrato: docs/api/admin.md, sección 5).
import { z } from 'zod';
import '../config/zod.js';
import { booleanoQuery, id, listaIds, slug } from './comunes.js';

const ENTERO_MAXIMO_PG = 2_147_483_647;

const idEntero = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .positive('Debe ser un número positivo.')
  .max(ENTERO_MAXIMO_PG, 'El número es demasiado grande.');

const diaSemana = z
  .number({ error: 'Debe ser un número entero.' })
  .int('Debe ser un número entero.')
  .min(1, 'Debe estar entre 1 (lunes) y 7 (domingo).')
  .max(7, 'Debe estar entre 1 (lunes) y 7 (domingo).');

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Debe tener formato HH:mm (24 horas).');

const descripcion = z
  .string()
  .trim()
  .max(150, 'La descripción puede tener hasta 150 caracteres.')
  .transform((texto) => (texto === '' ? null : texto));

export const paramsHorario = z.object({ id });

export const consultaHorarios = z.object({
  sede: slug.optional(),
  tipo: listaIds.optional(),
  activo: booleanoQuery.optional(),
});

export const cuerpoCrearHorario = z
  .strictObject({
    sedeId: idEntero.nullable().optional(),
    tipoHorarioId: idEntero,
    diaSemana,
    horaInicio: hora,
    horaFin: hora.nullable().optional().default(null),
    descripcion: descripcion.nullable().optional().default(null),
    activo: z.boolean().optional().default(true),
  })
  .refine(({ horaInicio, horaFin }) => horaFin === null || horaFin > horaInicio, {
    path: ['horaFin'],
    message: 'La hora de fin debe ser posterior a la hora de inicio.',
  });

export const cuerpoEditarHorario = z
  .strictObject({
    tipoHorarioId: idEntero.optional(),
    diaSemana: diaSemana.optional(),
    horaInicio: hora.optional(),
    horaFin: hora.nullable().optional(),
    descripcion: descripcion.nullable().optional(),
    activo: z.boolean().optional(),
  })
  .refine(
    ({ horaInicio, horaFin }) =>
      horaInicio === undefined || horaFin === undefined || horaFin === null || horaFin > horaInicio,
    {
      path: ['horaFin'],
      message: 'La hora de fin debe ser posterior a la hora de inicio.',
    },
  );
