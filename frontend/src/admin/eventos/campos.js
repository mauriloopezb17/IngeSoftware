// Conversión entre el objeto evento de la API (admin.md §4) y los campos del formulario.
// Las fechas se editan en hora de Bolivia, separadas en día y hora para que un evento «todo el día» solo pida el día.
import { aContenido, estaVacio } from '../publicaciones/contenido.js';
import { aCampoFecha } from '../publicaciones/fechas.js';

export const MAX_DESCRIPCION = 2000;
export const MAX_LUGAR = 150;
export const MAX_DIRECCION = 200;
export const MAX_MAPA = 1000;
export const MAX_PROGRAMA = 20;
export const MAX_ACTIVIDAD = 120;
export const MAX_RESPONSABLE_NOMBRE = 120;
export const MAX_RESPONSABLE_ROL = 80;
export const MAX_ENLACES = 10;
export const MAX_ENLACE_TEXTO = 80;
export const MAX_ENLACE_URL = 500;

const partir = (iso) => {
  const valor = aCampoFecha(iso); // "2026-11-22T10:00"
  return valor ? valor.split('T') : ['', ''];
};

export function camposDe(evento) {
  const [diaInicio, horaInicio] = partir(evento?.fechaInicio);
  const [diaFin, horaFin] = partir(evento?.fechaFin);
  const todoElDia = evento?.todoElDia ?? false;
  const detalle = evento?.detalle;

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
    direccion: detalle?.direccion ?? '',
    enlaceMapa: detalle?.enlaceMapa ?? '',
    programa: (detalle?.programa ?? []).map((item) => ({
      hora: item.hora ?? '',
      actividad: item.actividad ?? '',
    })),
    responsableNombre: detalle?.responsable?.nombre ?? '',
    responsableRol: detalle?.responsable?.rol ?? '',
    responsableTelefono: detalle?.responsable?.telefono ?? '',
    responsableCorreo: detalle?.responsable?.correo ?? '',
    enlaces: (detalle?.enlaces ?? []).map((item) => ({
      texto: item.texto ?? '',
      url: item.url ?? '',
    })),
  };
}

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

export function esEnlaceGoogleMaps(valor) {
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl') return url.pathname.length > 1;
    if (host === 'goo.gl') return url.pathname.startsWith('/maps/');
    if (/^(www\.)?google\.[a-z.]{2,10}$/.test(host)) return url.pathname.startsWith('/maps');
    if (/^maps\.google\.[a-z.]{2,10}$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function esUrlHttps(valor) {
  try {
    return new URL(valor).protocol === 'https:';
  } catch {
    return false;
  }
}

export function validarLocal(campos, { soloDetalle = false } = {}) {
  const errores = {};

  if (!soloDetalle) {
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
  }

  if (campos.direccion.trim().length > MAX_DIRECCION)
    errores.direccion = `La dirección puede tener hasta ${MAX_DIRECCION} caracteres.`;

  const mapa = campos.enlaceMapa.trim();
  if (mapa && (mapa.length > MAX_MAPA || !esEnlaceGoogleMaps(mapa)))
    errores.enlaceMapa = 'Debe ser una URL https:// de Google Maps.';

  if (campos.programa.length > MAX_PROGRAMA) {
    errores.programa = `Puede tener hasta ${MAX_PROGRAMA} actividades.`;
  } else if (campos.programa.some((item) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.hora.trim()))) {
    errores.programa = 'Indica una hora válida (HH:MM) para cada actividad del programa.';
  } else if (
    campos.programa.some((item) => !item.actividad.trim() || item.actividad.trim().length > MAX_ACTIVIDAD)
  ) {
    errores.programa = `Cada actividad debe tener entre 1 y ${MAX_ACTIVIDAD} caracteres.`;
  }

  const tieneResponsableSecundario = Boolean(
    campos.responsableRol.trim() || campos.responsableTelefono.trim() || campos.responsableCorreo.trim(),
  );
  if (tieneResponsableSecundario && !campos.responsableNombre.trim()) {
    errores.responsableNombre = 'Indica el nombre del responsable si completas su rol o contacto.';
  } else if (campos.responsableNombre.trim().length > MAX_RESPONSABLE_NOMBRE) {
    errores.responsableNombre = `El nombre puede tener hasta ${MAX_RESPONSABLE_NOMBRE} caracteres.`;
  }
  if (campos.responsableRol.trim().length > MAX_RESPONSABLE_ROL) {
    errores.responsableRol = `El rol puede tener hasta ${MAX_RESPONSABLE_ROL} caracteres.`;
  }
  const tel = campos.responsableTelefono.trim();
  if (tel && !/^[+\d()\s.-]{5,30}$/.test(tel)) {
    errores.responsableTelefono = 'Ingresa un teléfono válido (5 a 30 caracteres).';
  }
  const correo = campos.responsableCorreo.trim();
  if (correo && (correo.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
    errores.responsableCorreo = 'Ingresa un correo electrónico válido.';
  }

  if (campos.enlaces.length > MAX_ENLACES) {
    errores.enlaces = `Puede tener hasta ${MAX_ENLACES} enlaces.`;
  } else if (campos.enlaces.some((item) => !item.texto.trim() || item.texto.trim().length > MAX_ENLACE_TEXTO)) {
    errores.enlaces = `Cada enlace debe tener un texto de hasta ${MAX_ENLACE_TEXTO} caracteres.`;
  } else if (campos.enlaces.some((item) => !item.url.trim() || item.url.trim().length > MAX_ENLACE_URL || !esUrlHttps(item.url.trim()))) {
    errores.enlaces = 'Cada enlace debe tener una URL que empiece con https://.';
  }

  return errores;
}

export function detalleDe(campos, bloques = []) {
  const contenido = !estaVacio(bloques) ? aContenido(bloques) : null;
  const direccion = campos.direccion.trim() || null;
  const enlaceMapa = campos.enlaceMapa.trim() || null;
  const programa = campos.programa
    .map((item) => ({ hora: item.hora.trim(), actividad: item.actividad.trim() }))
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const nombreResp = campos.responsableNombre.trim();
  const responsable = nombreResp
    ? {
        nombre: nombreResp,
        rol: campos.responsableRol.trim() || null,
        telefono: campos.responsableTelefono.trim() || null,
        correo: campos.responsableCorreo.trim() || null,
      }
    : null;

  const enlaces = campos.enlaces.map((item) => ({
    texto: item.texto.trim(),
    url: item.url.trim(),
  }));

  if (!contenido && !direccion && !enlaceMapa && !programa.length && !responsable && !enlaces.length) {
    return null;
  }

  return {
    contenido,
    direccion,
    enlaceMapa,
    programa,
    responsable,
    enlaces,
  };
}

export function cuerpoDe(campos, bloques = []) {
  return {
    titulo: campos.titulo.trim(),
    descripcion: campos.descripcion.trim() || null,
    lugar: campos.lugar.trim() || null,
    ...fechasDe(campos),
    todoElDia: campos.todoElDia,
    categoriaEventoId: Number(campos.categoriaId),
    imagenId: campos.imagen?.id ?? null,
    estado: campos.estado,
    detalle: detalleDe(campos, bloques),
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
  detalle: 'contenido',
  'detalle.contenido': 'contenido',
  'detalle.contenido.bloques': 'contenido',
  'detalle.direccion': 'direccion',
  'detalle.enlaceMapa': 'enlaceMapa',
  'detalle.programa': 'programa',
  'detalle.responsable': 'responsableNombre',
  'detalle.responsable.nombre': 'responsableNombre',
  'detalle.responsable.rol': 'responsableRol',
  'detalle.responsable.telefono': 'responsableTelefono',
  'detalle.responsable.correo': 'responsableCorreo',
  'detalle.enlaces': 'enlaces',
};
