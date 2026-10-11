
import { Router } from 'express';
import { getFunciones, getFuncion, postFuncion, putFuncion, cancelarFuncion, getAsientosFuncion, } from '../controllers/funciones.controllers.js';
import { verificarToken, soloPersonal, } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getFunciones);
router.get('/:id/asientos', getAsientosFuncion);
router.get('/:id', getFuncion);

router.post('/', verificarToken, soloPersonal, postFuncion);
router.put('/:id', verificarToken, soloPersonal, putFuncion);
router.patch('/:id/cancelar', verificarToken, soloPersonal, cancelarFuncion);

export default router;