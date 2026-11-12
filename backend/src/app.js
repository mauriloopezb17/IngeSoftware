import express from 'express';
import routes from './routes/index.js';

// Crea la aplicación sin ponerla a escuchar, para poder probarla con Supertest.
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api', routes);

  return app;
}
