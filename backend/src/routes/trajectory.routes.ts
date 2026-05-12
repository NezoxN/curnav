import { Router } from 'express';
import { TrajectoryController } from '../controllers/TrajectoryController';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['STUDENT']));

router.post('/generate', TrajectoryController.generate);
router.post('/validate', TrajectoryController.validate);
router.post('/submit', TrajectoryController.submit);
router.get('/my', TrajectoryController.getMyTrajectories);
router.delete('/:id', TrajectoryController.cancelTrajectory);

export default router;
