import { Router } from 'express';
import {
  loginRequestSchema,
  registerRequestSchema,
} from '@studio/shared';
import type { AuthService } from '../services/auth.service.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import type { RateLimiters } from '../middleware/rate-limits.js';
import { passthrough } from '../middleware/rate-limits.js';

export function createAuthRoutes(
  auth: AuthService,
  limits: RateLimiters | null,
): Router {
  const router = Router();
  const controller = createAuthController(auth);
  const registerLimit = limits?.register ?? passthrough;
  const loginIp = limits?.loginIp ?? passthrough;
  const loginEmail = limits?.loginEmail ?? passthrough;

  router.post(
    '/auth/register',
    registerLimit,
    validate(registerRequestSchema),
    (req, res, next) => void controller.register(req, res, next),
  );

  router.post(
    '/auth/login',
    loginIp,
    loginEmail,
    validate(loginRequestSchema),
    (req, res, next) => void controller.login(req, res, next),
  );

  router.post('/auth/logout', requireAuth, (req, res, next) =>
    void controller.logout(req, res, next),
  );

  router.get('/me', requireAuth, (req, res, next) =>
    controller.me(req, res, next),
  );

  return router;
}
