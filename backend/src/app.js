import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { obtenerEntorno } from './config/entorno.js';
import { crearMiddlewareLog } from './config/logger.js';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores.js';
import routes from './routes/index.js';

// Límite del cuerpo JSON (contrato: docs/api/convenciones.md). Los archivos tienen sus propios límites.
const LIMITE_CUERPO_JSON = '1mb';

// Crea la aplicación sin ponerla a escuchar, para poder probarla con Supertest.
export function createApp() {
  const entorno = obtenerEntorno();
  const app = express();

  app.disable('x-powered-by');
  // Primero el log: así toda petición tiene su id (X-Request-Id), aunque falle después.
  app.use(crearMiddlewareLog());

  // Cabeceras de seguridad. La API solo responde JSON, así que los valores por defecto sirven.
  app.use(helmet());

  // Solo el origen del frontend (CORS_ORIGEN) puede llamar a la API desde el navegador,
  // y con credentials: true para que viaje la cookie de sesión del panel.
  app.use(
    cors({
      origin: [...entorno.corsOrigenes],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Accept', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Location', 'Retry-After'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: LIMITE_CUERPO_JSON }));
  app.use(cookieParser());

  app.use('/api', routes);

  // Al final: 404 para las rutas que nadie atendió y formato del contrato para todo error.
  app.use(rutaNoEncontrada);
  app.use(manejarErrores);

  return app;
}
