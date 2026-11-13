// Conversión entre el objeto evento de la API (admin.md §4) y los campos del formulario.
// Las fechas se editan en hora de Bolivia, separadas en día y hora para que un evento «todo el día» solo pida el día.
import { aCampoFecha } from '../publicaciones/fechas.js';

const partir = (iso) => {
  const valor = aCampoFecha(iso); // "2026-11-22T10:00"
  return valor ? valor.split('T') : ['', ''];
};

export function camposDe(evento) {
  const [diaInicio, horaInicio] = partir(evento?.fechaInicio);
  const [diaFin, horaFin] = partir(evento?.fechaFin);
  const todoElDia = evento?.todoElDia ?? false;
  return {
    titulo: evento?.titulo ?? '',
    descripcion: evento?.descripcion ?? '',
    lugar: evento?.lugar ?? '',
    categoriaId: evento?.categoria ? String(evento.categoria.id) : '',
    estado: evento?.estado?.codigo ?? 'PUBLICADO',
    todoElDia,
    diaInicio,
    horaInicio: todoElDia ? '' : horaInicio,
    diaFin,
    horaFin: todoElDia ? '' : horaFin,
    imagen: evento?.imagen ?? null,
  };
}

export const MAX_DESCRIPCION = 2000;
export const MAX_LUGAR = 150;

const conZona = (dia, hora) => `${dia}T${hora}:00-04:00`;

// Fechas que se envían. Con «todo el día» la API ignora las horas: se manda medianoche.
// Una hora de fin sin día de fin es del mismo día del inicio.
export function fechasDe(campos) {
  if (campos.todoElDia)
    return {
      fechaInicio: campos.diaInicio ? conZona(campos.diaInicio, '00:00') : null,
      fechaFin: campos.diaFin ? conZona(campos.diaFin, '00:00') : null,
    };
  const diaFin = campos.diaFin || (campos.horaFin ? campos.diaInicio : '');
  return {
    fechaInicio: campos.diaInicio && campos.horaInicio ? conZona(campos.diaInicio, campos.horaInicio) : null,
    fechaFin: diaFin && campos.horaFin ? conZona(diaFin, campos.horaFin) : null,
  };
}

export function validarLocal(campos) {
  const errores = {};
  const titulo = campos.titulo.trim();
  if (titulo.length < 3 || titulo.length > 200) errores.titulo = 'El título debe tener entre 3 y 200 caracteres.';
  if (!campos.diaInicio) errores.fechaInicio = 'Indica el día del evento.';
  else if (!campos.todoElDia && !campos.horaInicio) errores.fechaInicio = 'Indica la hora de inicio o marca «Todo el día».';
  if (!campos.todoElDia && campos.diaFin && !campos.horaFin) errores.fechaFin = 'Indica la hora de fin.';
  if (!campos.categoriaId) errores.categoria = 'Elige una categoría.';
  if (campos.descripcion.length > MAX_DESCRIPCION)
    errores.descripcion = `La descripción puede tener hasta ${MAX_DESCRIPCION} caracteres.`;
  if (campos.lugar.length > MAX_LUGAR) errores.lugar = `El lugar puede tener hasta ${MAX_LUGAR} caracteres.`;

  const { fechaInicio, fechaFin } = fechasDe(campos);
  if (!errores.fechaInicio && !errores.fechaFin && fechaInicio && fechaFin && new Date(fechaFin) < new Date(fechaInicio))
    errores.fechaFin = 'El fin debe ser igual o posterior al inicio.';
  return errores;
}

export function cuerpoDe(campos) {
  return {
    titulo: campos.titulo.trim(),
    descripcion: campos.descripcion.trim() || null,
    lugar: campos.lugar.trim() || null,
    ...fechasDe(campos),
    todoElDia: campos.todoElDia,
    categoriaEventoId: Number(campos.categoriaId),
    imagenId: campos.imagen?.id ?? null,
    estado: campos.estado,
  };
}

// Campo del detalle de un 400 -> campo del formulario.
export const CAMPO_DE_ERROR = {
  titulo: 'titulo',
  descripcion: 'descripcion',
  lugar: 'lugar',
  fechaInicio: 'fechaInicio',
  fechaFin: 'fechaFin',
  todoElDia: 'fechaInicio',
  categoriaEventoId: 'categoria',
  imagenId: 'imagen',
  estado: 'estado',
};
