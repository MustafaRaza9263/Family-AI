import { AppError, ErrorCodes } from '../lib/errors';
import {
  assertPasswordRules,
  generateRandomPassword,
  hashPassword,
} from '../lib/password';
import { AuditLog } from '../models/audit-log.model';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { User } from '../models/user.model';
import { writeAudit } from './audit.service';
import { clearPromptCache } from './prompt.service';
import { deleteAllSessionsForUser } from './session.service';
import type { KnowledgeStore } from './knowledge.service';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listUsers(options: {
  query: string;
  status?: 'pending' | 'active' | 'disabled';
  role?: 'user' | 'admin';
  page: number;
  limit: number;
}) {
  const filter: Record<string, unknown> = {};
  if (options.status) {
    filter.status = options.status;
  }
  if (options.role) {
    filter.role = options.role;
  }
  if (options.query.trim()) {
    const re = new RegExp(escapeRegex(options.query.trim()), 'i');
    filter.$or = [{ fullName: re }, { email: re }, { phone: re }];
  }

  const skip = (options.page - 1) * options.limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit).lean(),
    User.countDocuments(filter),
  ]);

  const counts = await Conversation.aggregate<{ _id: unknown; count: number }>([
    { $match: { userId: { $in: users.map((u) => u._id) } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  return {
    items: users.map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      conversationCount: countMap.get(u._id.toString()) ?? 0,
    })),
    total,
    page: options.page,
  };
}

export async function getUser(id: string) {
  const user = await User.findById(id).lean();
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export async function getUserConversations(
  actorId: string,
  userId: string,
  ip?: string | null,
) {
  await getUser(userId);
  await writeAudit({
    actorId,
    action: 'admin.view_user_chats',
    targetUserId: userId,
    ip,
  });
  const conversations = await Conversation.find({ userId })
    .sort({ updatedAt: -1 })
    .lean();
  return conversations.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    projectId: c.projectId,
    updatedAt: c.updatedAt,
  }));
}

export async function getConversationAdmin(
  actorId: string,
  conversationId: string,
  ip?: string | null,
) {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Conversation not found');
  }
  await writeAudit({
    actorId,
    action: 'admin.view_conversation',
    targetUserId: conversation.userId.toString(),
    targetConversationId: conversationId,
    ip,
  });
  const messages = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .lean();
  return {
    conversation: {
      id: conversation._id.toString(),
      userId: conversation.userId.toString(),
      title: conversation.title,
      projectId: conversation.projectId,
      updatedAt: conversation.updatedAt,
    },
    messages: messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      attachments: m.attachments ?? [],
      createdAt: m.createdAt,
      model: m.model,
      finishReason: m.finishReason,
      guardFlags: m.guardFlags,
    })),
  };
}

export async function setUserStatus(
  actorId: string,
  targetId: string,
  status: 'active' | 'disabled',
  ip?: string | null,
) {
  if (actorId === targetId && status === 'disabled') {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Cannot disable yourself');
  }
  const user = await User.findById(targetId);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }
  user.status = status;
  await user.save();
  if (status === 'disabled') {
    await deleteAllSessionsForUser(targetId);
  }
  await writeAudit({
    actorId,
    action: 'admin.set_status',
    targetUserId: targetId,
    ip,
    meta: { status },
  });
  return { id: targetId, status };
}

export async function setUserRole(
  actorId: string,
  targetId: string,
  role: 'user' | 'admin',
  ip?: string | null,
) {
  if (actorId === targetId) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Cannot change your own role');
  }
  const user = await User.findById(targetId);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }
  if (user.role === 'admin' && role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin', status: 'active' });
    if (adminCount <= 1) {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        'Cannot demote the last remaining admin',
      );
    }
  }
  user.role = role;
  await user.save();
  await writeAudit({
    actorId,
    action: 'admin.set_role',
    targetUserId: targetId,
    ip,
    meta: { role },
  });
  return { id: targetId, role };
}

export async function resetPassword(
  actorId: string,
  targetId: string,
  newPassword: string | undefined,
  ip?: string | null,
): Promise<{ id: string; temporaryPassword?: string }> {
  const user = await User.findById(targetId);
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }
  const password = newPassword ?? generateRandomPassword(14);
  assertPasswordRules(password, user.email);
  user.passwordHash = await hashPassword(password);
  user.mustChangePassword = true;
  await user.save();
  await deleteAllSessionsForUser(targetId);
  await writeAudit({
    actorId,
    action: 'admin.reset_password',
    targetUserId: targetId,
    ip,
  });
  return newPassword
    ? { id: targetId }
    : { id: targetId, temporaryPassword: password };
}

export async function reloadKnowledge(
  actorId: string,
  knowledge: KnowledgeStore,
  ip?: string | null,
): Promise<{ projectIds: string[] }> {
  const projectIds = await knowledge.reload();
  clearPromptCache();
  await writeAudit({
    actorId,
    action: 'admin.knowledge_reload',
    ip,
    meta: { projectIds },
  });
  return { projectIds };
}

export async function listAudit(options: { limit: number; before?: string }) {
  const filter: Record<string, unknown> = {};
  if (options.before) {
    filter.at = { $lt: new Date(options.before) };
  }
  const rows = await AuditLog.find(filter).sort({ at: -1 }).limit(options.limit).lean();
  return rows.map((r) => ({
    id: r._id.toString(),
    actorId: r.actorId.toString(),
    action: r.action,
    targetUserId: r.targetUserId?.toString(),
    targetConversationId: r.targetConversationId?.toString(),
    ip: r.ip,
    meta: r.meta,
    at: r.at,
  }));
}
