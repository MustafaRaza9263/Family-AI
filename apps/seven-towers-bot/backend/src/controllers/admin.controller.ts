import type { Request, Response } from 'express';
import { param } from '../lib/params';
import * as adminService from '../services/admin.service';
import type { KnowledgeStore } from '../services/knowledge.service';

export function createAdminController(knowledge: KnowledgeStore) {
  return {
    async listUsers(req: Request, res: Response): Promise<void> {
      const q = req.query as unknown as {
        query: string;
        status?: 'active' | 'disabled';
        role?: 'user' | 'admin';
        page: number;
        limit: number;
      };
      const result = await adminService.listUsers(q);
      res.json(result);
    },

    async getUser(req: Request, res: Response): Promise<void> {
      const user = await adminService.getUser(param(req, 'id'));
      res.json({ user });
    },

    async getUserConversations(req: Request, res: Response): Promise<void> {
      const items = await adminService.getUserConversations(
        req.user!.id,
        param(req, 'id'),
        req.ip,
      );
      res.json({ items });
    },

    async getConversation(req: Request, res: Response): Promise<void> {
      const result = await adminService.getConversationAdmin(
        req.user!.id,
        param(req, 'id'),
        req.ip,
      );
      res.json(result);
    },

    async setStatus(req: Request, res: Response): Promise<void> {
      const result = await adminService.setUserStatus(
        req.user!.id,
        param(req, 'id'),
        req.body.status,
        req.ip,
      );
      res.json(result);
    },

    async setRole(req: Request, res: Response): Promise<void> {
      const result = await adminService.setUserRole(
        req.user!.id,
        param(req, 'id'),
        req.body.role,
        req.ip,
      );
      res.json(result);
    },

    async resetPassword(req: Request, res: Response): Promise<void> {
      const result = await adminService.resetPassword(
        req.user!.id,
        param(req, 'id'),
        req.body.newPassword,
        req.ip,
      );
      res.json(result);
    },

    async reloadKnowledge(req: Request, res: Response): Promise<void> {
      const result = await adminService.reloadKnowledge(
        req.user!.id,
        knowledge,
        req.ip,
      );
      res.json(result);
    },

    async listAudit(req: Request, res: Response): Promise<void> {
      const q = req.query as unknown as { limit: number; before?: string };
      const items = await adminService.listAudit(q);
      res.json({ items });
    },
  };
}
