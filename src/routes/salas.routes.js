import { Router } from 'express';

import { getSalas, getSala, postSala, putSala, deleteSala } from '../controllers/salas.controllers.js';

import { verificarToken, soloPersonal } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getSalas);
router.get('/:id', getSala);
router.post('/', verificarToken, soloPersonal, postSala);
router.put('/:id', verificarToken, soloPersonal, putSala);
router.delete('/:id', verificarToken, soloPersonal, deleteSala);

export default router;
