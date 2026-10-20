import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
} from '../validators/auth.schemas';

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body as RegisterBody, req, res);
  if ('ok' in result) {
    res.status(201).json({ ok: true });
    return;
  }
  res.status(201).json({ user: result.user });
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
