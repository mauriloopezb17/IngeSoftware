// Llamadas de los boletines parroquiales en PDF (docs/api/admin.md §11, RF-06).
// Primero se sube el PDF a multimedia (multimedia/api.js) y luego se crea el boletín con ese `archivoId`.
import { clienteHttp } from '../../services/clienteHttp.js';

export const CLAVE_BOLETINES = ['admin', 'boletines'];
export const POR_PAGINA = 10;

export const listarBoletines = ({ anio, pagina, porPagina = POR_PAGINA }, senal) =>
  clienteHttp.get('/admin/boletines', { parametros: { anio, pagina, porPagina }, senal });

export async function obtenerBoletin(id, senal) {
  const { datos } = await clienteHttp.get(`/admin/boletines/${id}`, { senal });
  return datos;
}

export async function crearBoletin(cuerpo) {
  const { datos } = await clienteHttp.post('/admin/boletines', cuerpo);
  return datos;
}

export async function actualizarBoletin(id, cuerpo) {
  const { datos } = await clienteHttp.patch(`/admin/boletines/${id}`, cuerpo);
  return datos;
}

export const eliminarBoletin = (id) => clienteHttp.delete(`/admin/boletines/${id}`);

// "2026-11-01" -> "noviembre de 2026" (sin pasar por la zona horaria local).
const MES = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const formatearPeriodo = (periodo) => MES.format(new Date(`${periodo.slice(0, 7)}-15T12:00:00Z`));
