// Horarios agrupados por tipo (contrato: docs/api/publico.md, GET /api/sedes/:sede/horarios).
import * as modelo from '../models/horarios.model.js';
import { formatearHora } from '../utils/formato.js';

// dia_semana: 1 = lunes … 7 = domingo (ISO 8601).
const NOMBRES_DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const mayusculaInicial = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Une textos en español: ["a"] -> "a", ["a","b"] -> "a y b", ["a","b","c"] -> "a, b y c".
function enumerar(partes) {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
}

// Separa días ordenados en tramos de días seguidos: [1,2,3,5] -> [[1,2,3],[5]].
function tramosConsecutivos(dias) {
  const tramos = [];
  for (const dia of dias) {
    const ultimo = tramos.at(-1);
    if (ultimo && dia === ultimo.at(-1) + 1) ultimo.push(dia);
    else tramos.push([dia]);
  }
  return tramos;
}

// Etiqueta de una fila de horarios a partir de sus días (ordenados, sin repetir):
//  * tres o más días seguidos forman un rango: [1..5] -> "Lunes a viernes";
//  * los demás días se enumeran: [2,4] -> "Martes y jueves", [6,7] -> "Sábado y domingo";
//  * se pueden combinar: [1,2,3,5] -> "Lunes a miércoles y viernes";
//  * un solo día va con su nombre: [6] -> "Sábado".
export function etiquetaDias(dias) {
  const partes = tramosConsecutivos(dias).flatMap((tramo) =>
    tramo.length >= 3
      ? [`${NOMBRES_DIAS[tramo[0] - 1]} a ${NOMBRES_DIAS[tramo.at(-1) - 1]}`]
      : tramo.map((dia) => NOMBRES_DIAS[dia - 1]),
  );
  return mayusculaInicial(enumerar(partes));
}

// Agrupa filas de horario (ordenadas por tipo, día y hora) en el formato del contrato:
// [{ tipo, filas: [{ dias, etiqueta, horarios: [{ horaInicio, horaFin, descripcion }] }] }]
// Dentro de un tipo, los días con exactamente los mismos horarios forman una sola fila.
export function agruparHorarios(filas) {
  const tipos = new Map();

  for (const fila of filas) {
    if (!tipos.has(fila.tipo_id)) {
      tipos.set(fila.tipo_id, {
        tipo: { id: fila.tipo_id, nombre: fila.tipo_nombre },
        dias: new Map(),
      });
    }
    const { dias } = tipos.get(fila.tipo_id);
    if (!dias.has(fila.dia_semana)) dias.set(fila.dia_semana, []);
    dias.get(fila.dia_semana).push({
      horaInicio: formatearHora(fila.hora_inicio),
      horaFin: formatearHora(fila.hora_fin),
      descripcion: fila.descripcion,
    });
  }

  return [...tipos.values()].map(({ tipo, dias }) => {
    // Firma = la lista completa de horarios del día: días con la misma firma van juntos.
    const filasPorFirma = new Map();

    for (const dia of [...dias.keys()].sort((a, b) => a - b)) {
      const horarios = dias.get(dia).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      const firma = JSON.stringify(horarios);
      if (!filasPorFirma.has(firma)) filasPorFirma.set(firma, { dias: [], horarios });
      filasPorFirma.get(firma).dias.push(dia);
    }

    // Las filas quedan ordenadas por su primer día porque los días se recorren en orden.
    return {
      tipo,
      filas: [...filasPorFirma.values()].map(({ dias: diasFila, horarios }) => ({
        dias: diasFila,
        etiqueta: etiquetaDias(diasFila),
        horarios,
      })),
    };
  });
}

// GET /api/sedes/:sede/horarios. tipoIds: filtro opcional por id de tipo de horario.
export async function listarHorarios(sedeId, tipoIds = null) {
  return agruparHorarios(await modelo.listarActivos(sedeId, tipoIds));
}
