import express from 'express';
import { crearMiddlewareLog } from './config/logger.js';
import routes from './routes/index.js';

// Crea la aplicación sin ponerla a escuchar, para poder probarla con Supertest.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Primero el log: así toda petición tiene su id (X-Request-Id), aunque falle después.
  app.use(crearMiddlewareLog());
  app.use(express.json());
  app.use('/api', routes);

  return app;
}
