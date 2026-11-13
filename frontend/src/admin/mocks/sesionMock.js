// Sesión simulada del panel. La cookie httpOnly real no se puede imitar en el navegador:
// el usuario en sesión se guarda en una variable del módulo y en sessionStorage,
// para que sobreviva a una recarga de la página.
const CLAVE = 'admin-mock-sesion';

let sesionActual = null;

function leerAlmacen() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

function escribirAlmacen(sesion) {
  try {
    if (sesion) window.sessionStorage.setItem(CLAVE, JSON.stringify(sesion));
    else window.sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin sessionStorage (modo privado, etc.) la sesión dura solo mientras no se recargue.
  }
}

export function obtenerSesionMock() {
  sesionActual ??= leerAlmacen();
  return sesionActual;
}

export function guardarSesionMock(sesion) {
  sesionActual = sesion;
  escribirAlmacen(sesion);
}

export function borrarSesionMock() {
  sesionActual = null;
  escribirAlmacen(null);
}
