import { AuditLog } from '../models/audit-log.model';

export async function writeAudit(options: {
  actorId: string;
  action: string;
  targetUserId?: string;
  targetConversationId?: string;
  ip?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await AuditLog.create({
    actorId: options.actorId,
    action: options.action,
    targetUserId: options.targetUserId,
    targetConversationId: options.targetConversationId,
    ip: options.ip ?? null,
    meta: options.meta,
    at: new Date(),
  });
}
