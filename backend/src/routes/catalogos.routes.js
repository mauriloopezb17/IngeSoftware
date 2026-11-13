// Catálogos globales (convenciones §6: cuelgan directamente de /api, no de una sede).
//   GET /api/categorias
//   GET /api/categorias-evento
import { Router } from 'express';
import * as catalogos from '../controllers/catalogos.controller.js';

const router = Router();

router.get('/categorias', catalogos.listarCategorias);
router.get('/categorias-evento', catalogos.listarCategoriasEvento);

export default router;
