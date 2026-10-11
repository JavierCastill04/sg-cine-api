
import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controllers.js';
import { verificarToken, soloPersonal, } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', verificarToken, soloPersonal, getDashboard);

export default router;