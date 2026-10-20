import type { Request, Response } from 'express';
import { AppError, ErrorCodes } from '../lib/errors';
import { param } from '../lib/params';
import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';

export async function listConversations(req: Request, res: Response): Promise<void> {
  const limit = Number(req.query.limit ?? 20);
  const before = typeof req.query.before === 'string' ? new Date(req.query.before) : null;

  const filter: Record<string, unknown> = { userId: req.user!.id };
  if (before && !Number.isNaN(before.getTime())) {
    filter.updatedAt = { $lt: before };
  }

  const docs = await Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = docs.length > limit;
  const slice = hasMore ? docs.slice(0, limit) : docs;
  const items = slice.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    projectId: c.projectId,
    updatedAt: c.updatedAt,
  }));
  const nextBefore =
    hasMore && slice.length > 0
      ? slice[slice.length - 1]!.updatedAt.toISOString()
      : null;

  res.json({ items, nextBefore });
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const conversation = await Conversation.findOne({
    _id: param(req, 'id'),
    userId: req.user!.id,
  }).lean();

  if (!conversation) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Conversation not found');
  }

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      projectId: conversation.projectId,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    },
    messages: messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      attachments: m.attachments ?? [],
      createdAt: m.createdAt,
    })),
  });
}
