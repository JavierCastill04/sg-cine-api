import { Router } from 'express';
import { enviarAviso } from '../controllers/notificaciones.controllers.js';
import { verificarToken, soloPersonal, } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/aviso', verificarToken, soloPersonal, enviarAviso);

export default router;