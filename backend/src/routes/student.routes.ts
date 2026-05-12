import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['STUDENT']));

router.get('/profile', UserController.getProfile);
router.get('/records', UserController.getRecords);
router.get('/settings', UserController.getSettings);
router.put('/settings', UserController.updateSettings);

export default router;
