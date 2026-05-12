import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', CategoryController.getAll);

router.post('/', requireRole(['ADMIN']), CategoryController.create);
router.put('/:id', requireRole(['ADMIN']), CategoryController.update);
router.delete('/:id', requireRole(['ADMIN']), CategoryController.delete);

export default router;
