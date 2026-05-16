import { Router } from 'express';
import { TrajectoryController } from '../controllers/TrajectoryController';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { generateTrajectorySchema, submitTrajectorySchema } from '../validators/trajectory.validator';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['STUDENT']));

router.post('/generate', validate(generateTrajectorySchema), TrajectoryController.generate);
router.post('/submit', validate(submitTrajectorySchema), TrajectoryController.submit);
router.get('/my', TrajectoryController.getMyTrajectories);
router.delete('/:id', TrajectoryController.cancelTrajectory);

export default router;
