import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator';

const router = Router();

router.use(authenticateToken);

router.get('/', CategoryController.getAll);

router.post('/', requireRole(['ADMIN']), validate(createCategorySchema), CategoryController.create);
router.put('/:id', requireRole(['ADMIN']), validate(updateCategorySchema), CategoryController.update);
router.delete('/:id', requireRole(['ADMIN']), CategoryController.delete);

export default router;
