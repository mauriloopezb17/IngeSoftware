// Endpoints de administración del CMS (contrato: docs/api/admin.md), todos bajo /api/admin.
// Todos exigen sesión: sin cookie válida responden 401 NO_AUTENTICADO, existan o no.
// Cada módulo del panel registra aquí sus rutas y pone su requerirPermiso() (autorizar.js).
import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import bibliotecaRoutes from './biblioteca.routes.js';
import bitacoraRoutes from './bitacora.routes.js';
import adminHorariosRoutes from './adminHorarios.routes.js';
import adminServiciosRoutes from './adminServicios.routes.js';
import adminGruposRoutes from './adminGrupos.routes.js';
import adminSedesRoutes from './adminSedes.routes.js';
import adminVideosRoutes from './adminVideos.routes.js';
import adminUsuariosRoutes from './adminUsuarios.routes.js';
import multimediaRoutes from './multimedia.routes.js';

const router = Router();

router.use(autenticar);

router.use('/multimedia', multimediaRoutes);
router.use('/multimedia', bibliotecaRoutes);
router.use('/bitacora', bitacoraRoutes);
router.use('/horarios', adminHorariosRoutes);
router.use('/servicios', adminServiciosRoutes);
router.use('/grupos-pastorales', adminGruposRoutes);
router.use('/videos', adminVideosRoutes);
router.use('/sedes', adminSedesRoutes);
router.use('/usuarios', adminUsuariosRoutes);

export default router;
