import { Router } from 'express';
import { health } from '../controllers/healthController';
import auth from './auth';

const router = Router();

router.get('/health', health);
router.use('/auth', auth);

export default router;
