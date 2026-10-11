
import { Router } from 'express';
import { postReserva, getMisReservas, validarReserva, } from '../controllers/reservas.controllers.js';
import { verificarToken, soloCliente, soloPersonal, } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verificarToken, soloCliente, postReserva);
router.get('/misReservas', verificarToken, soloCliente, getMisReservas);
router.patch('/:codigo/validar', verificarToken, soloPersonal, validarReserva);

export default router;