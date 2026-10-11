import { Router } from 'express';
import { getPeliculas, getPelicula, postPelicula, putPelicula, deletePelicula, patchEstadoPelicula } from '../controllers/peliculas.controllers.js';
import { verificarToken, soloPersonal } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', getPeliculas);
router.get('/:id', getPelicula);
router.post('/', verificarToken, soloPersonal, postPelicula);
router.put('/:id', verificarToken, soloPersonal, putPelicula);
router.delete('/:id', verificarToken, soloPersonal, deletePelicula);
router.patch('/:id/estado', verificarToken, soloPersonal, patchEstadoPelicula);

export default router;