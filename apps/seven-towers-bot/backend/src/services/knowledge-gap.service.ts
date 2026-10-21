import { Types } from 'mongoose';
import { GAP_REPORTS_PER_DAY } from '../config/limits';
import { normalizeGapKey, sanitizeGapField } from '../lib/gap-text';
import { logger } from '../lib/logger';
import { KnowledgeGap } from '../models/knowledge-gap.model';
import { User } from '../models/user.model';

const LAST_QUESTION_MAX = 300;

/** In-memory per-user daily cap (resets on process restart, like chat limiters). */
const dailyCounts = new Map<string, { day: string; count: number }>();

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns true and consumes one slot when under the daily cap. */
export function tryConsumeGapQuota(userId: string): boolean {
  const day = utcDayKey();
  const entry = dailyCounts.get(userId);
  if (!entry || entry.day !== day) {
    dailyCounts.set(userId, { day, count: 1 });
    return true;
  }
  if (entry.count >= GAP_REPORTS_PER_DAY) {
    return false;
  }
  entry.count += 1;
  return true;
}

/** Test helper only. */
export function resetGapDailyQuota(): void {
  dailyCounts.clear();
}

export async function recordKnowledgeGap(options: {
  need: string;
  userId: string;
  askerName: string;
  askerEmail: string;
  lastQuestion: string;
  conversationId: string;
}): Promise<void> {
  if (!tryConsumeGapQuota(options.userId)) {
    return;
  }

  const need = sanitizeGapField(options.need, 200);
  const key = normalizeGapKey(need);
  if (key.length === 0) {
    return;
  }

  const lastQuestion = sanitizeGapField(options.lastQuestion, LAST_QUESTION_MAX);
  const lastAskerName = sanitizeGapField(options.askerName, 200);
  const lastAskerEmail = sanitizeGapField(options.askerEmail, 320);
  if (lastAskerName.length === 0 || lastAskerEmail.length === 0) {
    return;
  }

  const now = new Date();
  const conversationId = new Types.ObjectId(options.conversationId);

  const existing = await KnowledgeGap.findOne({ key });

  if (!existing) {
    await KnowledgeGap.create({
      key,
      need,
      count: 1,
      status: 'open',
      firstSeenAt: now,
      lastSeenAt: now,
      lastQuestion,
      lastAskerName,
      lastAskerEmail,
      lastConversationId: conversationId,
      reopenCount: 0,
    });
    return;
  }

  const $inc: { count: number; reopenCount?: number } = { count: 1 };
  const $set: Record<string, unknown> = {
    need,
    lastSeenAt: now,
    lastQuestion,
    lastAskerName,
    lastAskerEmail,
    lastConversationId: conversationId,
  };

  if (existing.status === 'resolved') {
    $set.status = 'open';
    $set.resolvedAt = null;
    $set.resolvedBy = null;
    $inc.reopenCount = 1;
  }

  await KnowledgeGap.updateOne({ _id: existing._id }, { $inc, $set });
}

/** Fire-and-forget: never throw to the chat path. */
export function scheduleKnowledgeGapRecords(options: {
  needs: string[];
  userId: string;
  lastQuestion: string;
  conversationId: string;
}): void {
  void (async () => {
    try {
      const user = await User.findById(options.userId).lean();
      if (!user) {
        logger.warn(
          { userId: options.userId, conversationId: options.conversationId },
          'Skipping knowledge gap save: user not found',
        );
        return;
      }

      for (const need of options.needs) {
        await recordKnowledgeGap({
          need,
          userId: options.userId,
          askerName: user.fullName,
          askerEmail: user.email,
          lastQuestion: options.lastQuestion,
          conversationId: options.conversationId,
        });
      }
    } catch (err) {
      logger.error(
        { err, conversationId: options.conversationId },
        'Failed to record knowledge gap(s)',
      );
    }
  })();
}
