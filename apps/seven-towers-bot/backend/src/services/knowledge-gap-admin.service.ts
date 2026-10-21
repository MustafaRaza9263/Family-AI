import { Types } from 'mongoose';
import { AppError, ErrorCodes } from '../lib/errors';
import { KnowledgeGap } from '../models/knowledge-gap.model';

export async function listKnowledgeGaps(options: {
  status: 'open' | 'resolved' | 'ignored';
  page: number;
}) {
  const limit = 50;
  const filter: Record<string, unknown> = { status: options.status };
  const skip = (options.page - 1) * limit;
  const [rows, total] = await Promise.all([
    KnowledgeGap.find(filter)
      .sort({ count: -1, lastSeenAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    KnowledgeGap.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => ({
      id: r._id.toString(),
      need: r.need,
      count: r.count,
      status: r.status,
      lastSeenAt: r.lastSeenAt,
      lastQuestion: r.lastQuestion,
      lastAskerName: r.lastAskerName,
      lastAskerEmail: r.lastAskerEmail,
      lastConversationId: r.lastConversationId.toString(),
      firstSeenAt: r.firstSeenAt,
      reopenCount: r.reopenCount,
    })),
    total,
    page: options.page,
  };
}

export async function updateKnowledgeGapStatus(
  id: string,
  status: 'open' | 'resolved' | 'ignored',
  actorId: string,
) {
  const gap = await KnowledgeGap.findById(id);
  if (!gap) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Knowledge gap not found');
  }

  gap.status = status;
  if (status === 'resolved') {
    gap.resolvedAt = new Date();
    gap.resolvedBy = new Types.ObjectId(actorId);
  } else {
    gap.resolvedAt = null;
    gap.resolvedBy = null;
  }
  await gap.save();

  return {
    id: gap._id.toString(),
    status: gap.status,
    resolvedAt: gap.resolvedAt,
    resolvedBy: gap.resolvedBy?.toString() ?? null,
  };
}
