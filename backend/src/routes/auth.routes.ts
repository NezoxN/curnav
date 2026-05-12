import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, resetPasswordSchema, confirmResetPasswordSchema } from '../validators/auth.validator';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', validate(loginSchema), AuthController.login);
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/reset-password/confirm', validate(confirmResetPasswordSchema), AuthController.confirmResetPassword);
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/refresh', AuthController.refresh);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
