import { clienteHttp } from './clienteHttp.js';

export async function obtenerSedes(senal) {
  const { datos } = await clienteHttp.get('/sedes', { senal });
  return datos;
}

export async function obtenerSede(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}`, { senal });
  return datos;
}

export async function obtenerMenuPaginas(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/paginas`, { senal });
  return datos;
}

export async function obtenerPagina(sede, slug, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/paginas/${slug}`, { senal });
  return datos;
}

export async function obtenerHorarios(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/horarios`, { senal });
  return datos;
}

export async function obtenerServicios(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/servicios`, { senal });
  return datos;
}

export async function obtenerServicio(sede, slug, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/servicios/${slug}`, { senal });
  return datos;
}

export async function obtenerEventos(sede, parametros, senal) {
  return clienteHttp.get(`/sedes/${sede}/eventos`, { parametros, senal });
}

export async function obtenerPublicaciones(sede, parametros, senal) {
  return clienteHttp.get(`/sedes/${sede}/publicaciones`, { parametros, senal });
}

export async function obtenerPublicacion(sede, slug, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/publicaciones/${slug}`, { senal });
  return datos;
}

export async function obtenerBoletines(sede, parametros, senal) {
  return clienteHttp.get(`/sedes/${sede}/boletines`, { parametros, senal });
}

export async function obtenerProclamas(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/proclamas`, { senal });
  return datos;
}

export async function obtenerHistorialProclamas(sede, parametros, senal) {
  return clienteHttp.get(`/sedes/${sede}/proclamas/historial`, { parametros, senal });
}

export async function obtenerGruposPastorales(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/grupos-pastorales`, { senal });
  return datos;
}

export async function obtenerVideos(sede, senal) {
  const { datos } = await clienteHttp.get(`/sedes/${sede}/videos`, { senal });
  return datos;
}

export async function obtenerCategorias(senal) {
  const { datos } = await clienteHttp.get('/categorias', { senal });
  return datos;
}

export async function obtenerCategoriasEvento(senal) {
  const { datos } = await clienteHttp.get('/categorias-evento', { senal });
  return datos;
}
