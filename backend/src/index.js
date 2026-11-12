import { createApp } from './app.js';
import { ErrorEntorno, obtenerEntorno } from './config/entorno.js';

let entorno;

try {
  entorno = obtenerEntorno();
} catch (error) {
  if (!(error instanceof ErrorEntorno)) throw error;
  // Sin una configuración válida todavía no hay logger: se informa por consola y se sale.
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exit(1);
}

const app = createApp();

const servidor = app.listen(entorno.puerto, () => {
  // Se reemplazará por el logger (pino) en la tarea de logging.
  // eslint-disable-next-line no-console
  console.info(`API escuchando en http://localhost:${entorno.puerto}`);
});

// Cierre ordenado: deja terminar las peticiones en curso antes de salir.
function apagar() {
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
