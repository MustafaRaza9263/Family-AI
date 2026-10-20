import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { originCheck } from '../middleware/origin-check';
import { loginRateLimiter, signupRateLimiter } from '../middleware/rate-limiters';
import { validate } from '../middleware/validate';
import {
  changePasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
} from '../validators/auth.schemas';

export const authRoutes = Router();

authRoutes.post(
  '/api/auth/register',
  originCheck,
  signupRateLimiter,
  validate(registerBodySchema),
  authController.register,
);

authRoutes.post(
  '/api/auth/login',
  originCheck,
  loginRateLimiter,
  validate(loginBodySchema),
  authController.login,
);

authRoutes.post('/api/auth/logout', requireAuth, originCheck, authController.logout);

authRoutes.get('/api/auth/me', requireAuth, authController.me);

authRoutes.post(
  '/api/auth/change-password',
  requireAuth,
  originCheck,
  validate(changePasswordBodySchema),
  authController.changePassword,
);
