
import { Router } from 'express';
import { registrarDispositivo, eliminarDispositivo, } from '../controllers/dispositivos.controllers.js';
import { verificarToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verificarToken, registrarDispositivo);
router.delete('/:token', verificarToken, eliminarDispositivo);

export default router;