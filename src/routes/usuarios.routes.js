import { Router } from 'express';
import { postRegistro, postLogin, } from '../controllers/usuarios.controllers.js';

const router = Router();

router.post('/registro', postRegistro);
router.post('/login', postLogin);

export default router;