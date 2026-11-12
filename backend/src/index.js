import { createApp } from './app.js';

const puerto = Number(process.env.PORT) || 3000;
const app = createApp();

const servidor = app.listen(puerto, () => {
  // Se reemplazará por el logger (pino) en la tarea de logging.
  // eslint-disable-next-line no-console
  console.info(`API escuchando en http://localhost:${puerto}`);
});

// Cierre ordenado: deja terminar las peticiones en curso antes de salir.
function apagar() {
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
