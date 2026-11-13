// Usuarios de desarrollo del seed (database/seed) tal como los devuelve la API
// (docs/api/autenticacion.md §2). La contraseña de los cuatro es solo para desarrollo y pruebas.
export const CONTRASENA_DESARROLLO = 'Parroquia2026!';

export const SEDE_PRINCIPAL = {
  id: 1,
  nombre: 'Parroquia Señor de la Exaltación',
  slug: 'senor-de-la-exaltacion',
};

// Los permisos están escritos a mano (no se importan de permisos/matriz.js) para que una
// prueba detecte si el mock y la matriz del panel dejan de coincidir.
// Secretaría es el ejemplo literal del contrato; los demás salen de la matriz de §7.
export const usuariosSeed = [
  {
    id: 1,
    nombreCompleto: 'Administrador (desarrollo)',
    correo: 'admin@parroquia.test',
    rol: { codigo: 'ADMINISTRADOR', nombre: 'Administrador' },
    sede: SEDE_PRINCIPAL,
    permisos: [
      'multimedia.subir',
      'multimedia.eliminar',
      'avisos.gestionar',
      'noticias.redactar',
      'noticias.publicar',
      'eventos.gestionar',
      'horarios.gestionar',
      'servicios.gestionar',
      'grupos.gestionar',
      'videos.gestionar',
      'sede.editar',
      'sedes.gestionar',
      'proclamas.gestionar',
      'boletines.gestionar',
      'paginas.gestionar',
      'usuarios.gestionar',
      'bitacora.ver',
    ],
  },
  {
    id: 2,
    nombreCompleto: 'Párroco (desarrollo)',
    correo: 'parroco@parroquia.test',
    rol: { codigo: 'PARROCO', nombre: 'Párroco' },
    sede: SEDE_PRINCIPAL,
    permisos: [
      'multimedia.subir',
      'multimedia.eliminar',
      'avisos.gestionar',
      'noticias.redactar',
      'noticias.publicar',
      'eventos.gestionar',
      'horarios.gestionar',
      'servicios.gestionar',
      'grupos.gestionar',
      'videos.gestionar',
      'sede.editar',
      'proclamas.gestionar',
      'boletines.gestionar',
      'paginas.gestionar',
      'bitacora.ver',
    ],
  },
  {
    id: 3,
    nombreCompleto: 'Secretaría (desarrollo)',
    correo: 'secretaria@parroquia.test',
    rol: { codigo: 'SECRETARIA', nombre: 'Secretaría' },
    sede: SEDE_PRINCIPAL,
    permisos: [
      'multimedia.subir',
      'multimedia.eliminar',
      'avisos.gestionar',
      'eventos.gestionar',
      'horarios.gestionar',
      'servicios.gestionar',
      'grupos.gestionar',
      'videos.gestionar',
      'sede.editar',
      'proclamas.gestionar',
      'boletines.gestionar',
      'paginas.gestionar',
    ],
  },
  {
    id: 4,
    nombreCompleto: 'Marketing (desarrollo)',
    correo: 'marketing@parroquia.test',
    rol: { codigo: 'MARKETING', nombre: 'Marketing' },
    sede: SEDE_PRINCIPAL,
    permisos: [
      'multimedia.subir',
      'multimedia.eliminar',
      'noticias.redactar',
      'videos.gestionar',
      'boletines.gestionar',
    ],
  },
];

// Fecha ISO con el desfase de Bolivia (-04:00), como en los ejemplos del contrato.
export function fechaBolivia(fecha) {
  const local = new Date(fecha.getTime() - 4 * 60 * 60 * 1000);
  return `${local.toISOString().slice(0, 19)}-04:00`;
}

// Objeto de sesión de la API: lo devuelven POST /auth/login y GET /auth/yo.
export function crearSesion(usuario, ahora = new Date()) {
  const expira = new Date(ahora.getTime() + 8 * 60 * 60 * 1000); // JWT_EXPIRA_EN por defecto: 8h
  return {
    ...usuario,
    fechaUltimoAcceso: fechaBolivia(ahora),
    sesionExpiraEn: fechaBolivia(expira),
  };
}
