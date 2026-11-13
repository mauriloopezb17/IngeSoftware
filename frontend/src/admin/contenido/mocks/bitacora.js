// Datos iniciales y handlers MSW de la bitácora de cambios (docs/api/admin.md §13).
import { http, HttpResponse } from 'msw';

import { api } from '../../../mocks/api.js';

const ACCIONES_VALIDAS = new Set(['INSERT', 'UPDATE', 'DELETE']);
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function crearBitacoraInicial() {
  return [
    {
      id: 128,
      sedeId: 1,
      usuario: { id: 2, nombreCompleto: 'Párroco (desarrollo)' },
      entidad: 'publicacion',
      entidadId: '7',
      accion: 'UPDATE',
      datosAnteriores: {
        estado_publicacion_id: 4,
        revisado_por: null,
        fecha_revision: null,
      },
      datosNuevos: {
        estado_publicacion_id: 2,
        revisado_por: 2,
        fecha_revision: '2026-11-12T18:02:11-04:00',
      },
      direccionIp: '190.129.24.18',
      fecha: '2026-11-12T18:02:11-04:00',
    },
    {
      id: 127,
      sedeId: 1,
      usuario: { id: 1, nombreCompleto: 'Administrador (desarrollo)' },
      entidad: 'usuario',
      entidadId: '4',
      accion: 'UPDATE',
      datosAnteriores: {
        hash_contrasena: '[oculto]',
        activo: false,
      },
      datosNuevos: {
        hash_contrasena: '[oculto]',
        activo: true,
      },
      direccionIp: '190.129.24.10',
      fecha: '2026-11-12T11:15:00-04:00',
    },
    {
      id: 126,
      sedeId: 2,
      usuario: { id: 1, nombreCompleto: 'Administrador (desarrollo)' },
      entidad: 'horario',
      entidadId: '18',
      accion: 'INSERT',
      datosAnteriores: null,
      datosNuevos: {
        sede_id: 2,
        dia_semana: 7,
        hora_inicio: '09:00',
        activo: true,
      },
      direccionIp: '190.129.24.10',
      fecha: '2026-11-11T16:40:00-04:00',
    },
    {
      id: 125,
      sedeId: 1,
      usuario: { id: 3, nombreCompleto: 'Secretaría (desarrollo)' },
      entidad: 'pagina',
      entidadId: '2',
      accion: 'UPDATE',
      datosAnteriores: {
        descripcion_seo: null,
      },
      datosNuevos: {
        descripcion_seo: 'Comunidad parroquial confiada a los Padres Pasionistas en Obrajes, La Paz.',
      },
      direccionIp: '190.129.24.22',
      fecha: '2026-11-10T10:20:00-04:00',
    },
    {
      id: 124,
      sedeId: 1,
      usuario: { id: 4, nombreCompleto: 'Marketing (desarrollo)' },
      entidad: 'publicacion',
      entidadId: '12',
      accion: 'DELETE',
      datosAnteriores: {
        titulo: 'Borrador antiguo de prueba',
        estado_publicacion_id: 1,
      },
      datosNuevos: null,
      direccionIp: '190.129.24.35',
      fecha: '2026-11-09T14:05:00-04:00',
    },
    {
      id: 123,
      sedeId: 1,
      usuario: null,
      entidad: 'bloque',
      entidadId: '1',
      accion: 'INSERT',
      datosAnteriores: null,
      datosNuevos: {
        pagina_id: 1,
        tipo: 'hero_video',
        orden: 1,
        visible: true,
      },
      direccionIp: null,
      fecha: '2026-11-01T09:00:00-04:00',
    },
  ];
}

function quitarSedeInterna(registro) {
  const copia = { ...registro };
  delete copia.sedeId;
  return copia;
}

export function crearControladorBitacora(ctx) {
  let registros = crearBitacoraInicial();

  function reiniciar() {
    registros = crearBitacoraInicial();
  }

  const handlers = [
    http.get(api('/admin/bitacora'), ({ request }) => {
      const auth = ctx.autenticar(
        'bitacora.ver',
        'Tu rol no tiene permiso para consultar la bitácora.',
      );
      if (auth.respuesta) return auth.respuesta;

      const parametros = new URL(request.url).searchParams;
      const entidad = parametros.get('entidad')?.trim() || '';
      const entidadId = parametros.get('entidadId')?.trim() || '';
      const usuarioParam = parametros.get('usuario')?.trim() || '';
      const accion = parametros.get('accion')?.trim() || '';
      const desde = parametros.get('desde')?.trim() || '';
      const hasta = parametros.get('hasta')?.trim() || '';
      const pagina = Math.max(1, Number(parametros.get('pagina') || 1));
      const porPagina = Math.min(100, Math.max(1, Number(parametros.get('porPagina') || 10)));

      const detalles = [];
      if (accion && !ACCIONES_VALIDAS.has(accion)) {
        detalles.push({ campo: 'accion', mensaje: 'La acción debe ser INSERT, UPDATE o DELETE.' });
      }
      if (desde && !REGEX_FECHA.test(desde)) {
        detalles.push({ campo: 'desde', mensaje: 'La fecha inicial debe tener formato YYYY-MM-DD.' });
      }
      if (hasta && !REGEX_FECHA.test(hasta)) {
        detalles.push({ campo: 'hasta', mensaje: 'La fecha final debe tener formato YYYY-MM-DD.' });
      }
      if (detalles.length) return ctx.errorValidacion(detalles);

      const esAdmin = ctx.esAdministrador(auth.usuario);

      const filtrados = registros
        .filter((r) => {
          if (!esAdmin && r.sedeId !== auth.usuario.sede?.id) return false;
          if (entidad && r.entidad !== entidad) return false;
          if (entidadId && r.entidadId !== entidadId) return false;
          if (usuarioParam && String(r.usuario?.id ?? '') !== usuarioParam) return false;
          if (accion && r.accion !== accion) return false;
          const fechaDia = r.fecha.slice(0, 10);
          if (desde && fechaDia < desde) return false;
          if (hasta && fechaDia > hasta) return false;
          return true;
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

      const total = filtrados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
      const inicio = (pagina - 1) * porPagina;
      const datos = filtrados.slice(inicio, inicio + porPagina).map(quitarSedeInterna);

      return HttpResponse.json({
        datos,
        paginacion: {
          pagina,
          porPagina,
          total,
          totalPaginas,
        },
      });
    }),
  ];

  return { handlers, reiniciar };
}

