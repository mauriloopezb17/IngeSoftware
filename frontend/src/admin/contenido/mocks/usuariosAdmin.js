// Datos iniciales y handlers MSW de gestión de usuarios (docs/api/admin.md §14).
import { http, HttpResponse } from 'msw';

import { api } from '../../../mocks/api.js';
import { usuariosSeed } from '../../mocks/usuarios.js';
import { CATALOGOS } from './datos.js';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ULTIMO_ACCESO_SEED = {
  1: '2026-11-12T08:30:00-04:00',
  2: '2026-11-11T17:45:00-04:00',
  3: '2026-11-12T09:15:00-04:00',
  4: '2026-11-12T09:02:17-04:00',
};

export function crearUsuariosAdminIniciales() {
  return usuariosSeed.map((u) => ({
    id: u.id,
    nombreCompleto: u.nombreCompleto,
    correo: u.correo,
    rol: { ...u.rol },
    sede: u.sede ? { ...u.sede } : null,
    activo: true,
    fechaUltimoAcceso: ULTIMO_ACCESO_SEED[u.id] ?? null,
    fechaCreacion: '2026-10-26T10:12:37-04:00',
  }));
}

function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function crearControladorUsuariosAdmin(ctx) {
  let usuarios = crearUsuariosAdminIniciales();
  let sigUsuarioId = usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;

  function reiniciar() {
    usuarios = crearUsuariosAdminIniciales();
    sigUsuarioId = usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  }

  function resumenSede(sede) {
    return sede ? { id: sede.id, nombre: sede.nombre, slug: sede.slug } : null;
  }

  const handlers = [
    http.get(api('/admin/usuarios'), ({ request }) => {
      const auth = ctx.autenticar('usuarios.gestionar', 'Solo el Administrador puede gestionar usuarios.');
      if (auth.respuesta) return auth.respuesta;

      const parametros = new URL(request.url).searchParams;
      const rol = parametros.get('rol') || '';
      const sede = parametros.get('sede') || '';
      const activoParam = parametros.get('activo');
      const buscar = normalizarTexto(parametros.get('buscar'));
      const pagina = Math.max(1, Number(parametros.get('pagina') || 1));
      const porPagina = Math.min(100, Math.max(1, Number(parametros.get('porPagina') || 20)));

      if (rol && !CATALOGOS.roles.some((r) => r.codigo === rol)) {
        return ctx.errorValidacion([{ campo: 'rol', mensaje: 'El rol indicado no es válido.' }]);
      }
      if (activoParam !== null && activoParam !== '' && activoParam !== 'true' && activoParam !== 'false') {
        return ctx.errorValidacion([{ campo: 'activo', mensaje: 'El filtro activo debe ser true o false.' }]);
      }

      const filtrados = usuarios
        .filter((u) => {
          if (rol && u.rol.codigo !== rol) return false;
          if (sede && u.sede?.slug !== sede) return false;
          if (activoParam === 'true' && !u.activo) return false;
          if (activoParam === 'false' && u.activo) return false;
          if (buscar) {
            const enNombre = normalizarTexto(u.nombreCompleto).includes(buscar);
            const enCorreo = normalizarTexto(u.correo).includes(buscar);
            if (!enNombre && !enCorreo) return false;
          }
          return true;
        })
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));

      const total = filtrados.length;
      const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
      const inicio = (pagina - 1) * porPagina;
      const datos = filtrados.slice(inicio, inicio + porPagina);

      return HttpResponse.json({
        datos,
        meta: {
          paginacion: {
            pagina,
            porPagina,
            total,
            totalPaginas,
          },
        },
      });
    }),

    http.get(api('/admin/usuarios/:id'), ({ params }) => {
      const auth = ctx.autenticar('usuarios.gestionar', 'Solo el Administrador puede gestionar usuarios.');
      if (auth.respuesta) return auth.respuesta;

      const usuario = usuarios.find((u) => u.id === Number(params.id));
      if (!usuario) return ctx.error(404, 'NO_ENCONTRADO', 'El usuario no existe.');

      return HttpResponse.json({ datos: usuario });
    }),

    http.post(api('/admin/usuarios'), async ({ request }) => {
      const auth = ctx.autenticar('usuarios.gestionar', 'Solo el Administrador puede gestionar usuarios.');
      if (auth.respuesta) return auth.respuesta;

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const detalles = [];
      const nombreCompleto = typeof cuerpo.nombreCompleto === 'string' ? cuerpo.nombreCompleto.trim() : '';
      if (!nombreCompleto || nombreCompleto.length > 120) {
        detalles.push({
          campo: 'nombreCompleto',
          mensaje: 'El nombre completo es obligatorio y admite hasta 120 caracteres.',
        });
      }

      const correo = typeof cuerpo.correo === 'string' ? cuerpo.correo.trim() : '';
      if (!correo || correo.length > 120 || !REGEX_CORREO.test(correo)) {
        detalles.push({ campo: 'correo', mensaje: 'Ingresa un correo electrónico válido.' });
      }

      const rolObj = CATALOGOS.roles.find((r) => r.codigo === cuerpo.rol);
      if (!rolObj) {
        detalles.push({ campo: 'rol', mensaje: 'El rol seleccionado no es válido.' });
      }

      let sede = null;
      const sedes = ctx.obtenerSedes();
      if (cuerpo.sedeId !== undefined && cuerpo.sedeId !== null && cuerpo.sedeId !== '') {
        const encontrada = sedes.find((s) => s.id === Number(cuerpo.sedeId));
        if (!encontrada) {
          detalles.push({ campo: 'sedeId', mensaje: 'La sede indicada no existe.' });
        } else {
          sede = resumenSede(encontrada);
        }
      } else if (rolObj && rolObj.codigo !== 'ADMINISTRADOR') {
        detalles.push({
          campo: 'sedeId',
          mensaje: 'La sede es obligatoria para todo rol distinto de Administrador.',
        });
      }

      const contrasena = typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '';
      if (contrasena.length < 10) {
        detalles.push({
          campo: 'contrasena',
          mensaje: 'La contraseña debe tener al menos 10 caracteres.',
        });
      }

      if (detalles.length) return ctx.errorValidacion(detalles);

      if (usuarios.some((u) => u.correo.toLowerCase() === correo.toLowerCase())) {
        return ctx.error(409, 'CONFLICTO', `Ya existe un usuario registrado con el correo «${correo}».`);
      }

      const nuevo = {
        id: sigUsuarioId++,
        nombreCompleto,
        correo,
        rol: { codigo: rolObj.codigo, nombre: rolObj.nombre },
        sede,
        activo: cuerpo.activo !== undefined ? Boolean(cuerpo.activo) : true,
        fechaUltimoAcceso: null,
        fechaCreacion: new Date().toISOString(),
      };
      usuarios.push(nuevo);

      return HttpResponse.json(
        { datos: nuevo },
        { status: 201, headers: { Location: `/api/admin/usuarios/${nuevo.id}` } },
      );
    }),

    http.patch(api('/admin/usuarios/:id'), async ({ request, params }) => {
      const auth = ctx.autenticar('usuarios.gestionar', 'Solo el Administrador puede gestionar usuarios.');
      if (auth.respuesta) return auth.respuesta;

      const recurso = usuarios.find((u) => u.id === Number(params.id));
      if (!recurso) return ctx.error(404, 'NO_ENCONTRADO', 'El usuario no existe.');

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const detalles = [];
      const nombreCompleto =
        cuerpo.nombreCompleto !== undefined
          ? String(cuerpo.nombreCompleto ?? '').trim()
          : recurso.nombreCompleto;
      if (!nombreCompleto || nombreCompleto.length > 120) {
        detalles.push({
          campo: 'nombreCompleto',
          mensaje: 'El nombre completo es obligatorio y admite hasta 120 caracteres.',
        });
      }

      const correo = cuerpo.correo !== undefined ? String(cuerpo.correo ?? '').trim() : recurso.correo;
      if (!correo || correo.length > 120 || !REGEX_CORREO.test(correo)) {
        detalles.push({ campo: 'correo', mensaje: 'Ingresa un correo electrónico válido.' });
      }

      const rolObj =
        cuerpo.rol !== undefined
          ? CATALOGOS.roles.find((r) => r.codigo === cuerpo.rol)
          : recurso.rol;
      if (!rolObj) {
        detalles.push({ campo: 'rol', mensaje: 'El rol seleccionado no es válido.' });
      }

      let sede = recurso.sede;
      const sedes = ctx.obtenerSedes();
      if (cuerpo.sedeId !== undefined) {
        if (cuerpo.sedeId === null || cuerpo.sedeId === '') {
          sede = null;
        } else {
          const encontrada = sedes.find((s) => s.id === Number(cuerpo.sedeId));
          if (!encontrada) {
            detalles.push({ campo: 'sedeId', mensaje: 'La sede indicada no existe.' });
          } else {
            sede = resumenSede(encontrada);
          }
        }
      }

      if (rolObj && rolObj.codigo !== 'ADMINISTRADOR' && !sede) {
        detalles.push({
          campo: 'sedeId',
          mensaje: 'La sede es obligatoria para todo rol distinto de Administrador.',
        });
      }

      if (detalles.length) return ctx.errorValidacion(detalles);

      if (
        usuarios.some(
          (u) => u.id !== recurso.id && u.correo.toLowerCase() === correo.toLowerCase(),
        )
      ) {
        return ctx.error(409, 'CONFLICTO', `Ya existe otro usuario con el correo «${correo}».`);
      }

      const activoResultante = cuerpo.activo !== undefined ? Boolean(cuerpo.activo) : recurso.activo;

      if (recurso.id === auth.usuario.id) {
        if (!activoResultante) {
          return ctx.error(409, 'CONFLICTO', 'No puedes desactivar tu propia cuenta.');
        }
        if (rolObj.codigo !== 'ADMINISTRADOR') {
          return ctx.error(409, 'CONFLICTO', 'No puedes quitarte el rol de Administrador a ti mismo.');
        }
      }

      const dejaDeSerAdminActivo =
        recurso.rol.codigo === 'ADMINISTRADOR' &&
        recurso.activo &&
        (!activoResultante || rolObj.codigo !== 'ADMINISTRADOR');

      if (dejaDeSerAdminActivo) {
        const hayOtroAdminActivo = usuarios.some(
          (u) => u.id !== recurso.id && u.rol.codigo === 'ADMINISTRADOR' && u.activo,
        );
        if (!hayOtroAdminActivo) {
          return ctx.error(
            409,
            'CONFLICTO',
            'Debe quedar al menos un Administrador activo en el sistema.',
          );
        }
      }

      recurso.nombreCompleto = nombreCompleto;
      recurso.correo = correo;
      recurso.rol = { codigo: rolObj.codigo, nombre: rolObj.nombre };
      recurso.sede = sede;
      recurso.activo = activoResultante;

      return HttpResponse.json({ datos: recurso });
    }),

    http.post(api('/admin/usuarios/:id/restablecer-contrasena'), async ({ request, params }) => {
      const auth = ctx.autenticar('usuarios.gestionar', 'Solo el Administrador puede gestionar usuarios.');
      if (auth.respuesta) return auth.respuesta;

      const recurso = usuarios.find((u) => u.id === Number(params.id));
      if (!recurso) return ctx.error(404, 'NO_ENCONTRADO', 'El usuario no existe.');

      const cuerpo = await request.json().catch(() => null);
      if (!cuerpo) return ctx.errorValidacion([{ campo: 'cuerpo', mensaje: 'El cuerpo JSON no es válido.' }]);

      const contrasenaNueva = typeof cuerpo.contrasenaNueva === 'string' ? cuerpo.contrasenaNueva : '';
      if (contrasenaNueva.length < 10) {
        return ctx.errorValidacion([
          { campo: 'contrasenaNueva', mensaje: 'La nueva contraseña debe tener al menos 10 caracteres.' },
        ]);
      }

      return new HttpResponse(null, { status: 204 });
    }),
  ];

  return { handlers, reiniciar };
}

