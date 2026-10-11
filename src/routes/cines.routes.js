import { Router } from 'express';
import { getCines } from '../controllers/cines.controllers.js';

const router = Router();

router.get('/', getCines);

export default router;