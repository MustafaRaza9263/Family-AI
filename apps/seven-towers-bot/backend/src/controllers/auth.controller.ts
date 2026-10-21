import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
} from '../validators/auth.schemas';

export async function register(req: Request, res: Response): Promise<void> {
  await authService.register(req.body as RegisterBody);
  // Same shape for real signup and honeypot (pending approval; no session).
  res.status(201).json({ ok: true });
}

export async function login(req: Request, res: Response): Promise<void> {
  const user = await authService.login(req.body as LoginBody, req, res);
  res.status(200).json({ user });
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req, res);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  res.status(200).json({ user: req.user });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const body = req.body as ChangePasswordBody;
  await authService.changePassword(
    req.user!.id,
    req.sessionId!,
    body.currentPassword,
    body.newPassword,
    req.user!.email,
  );
  res.status(204).send();
}
