import { Types } from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GAP_REPORTS_PER_DAY } from '../../src/config/limits';
import { normalizeGapKey } from '../../src/lib/gap-text';
import { KnowledgeGap } from '../../src/models/knowledge-gap.model';
import {
  recordKnowledgeGap,
  resetGapDailyQuota,
} from '../../src/services/knowledge-gap.service';
import { reportGapArgsSchema } from '../../src/services/report-gap.tool';
import { executeTool } from '../../src/services/tools.service';
import { createFakeKnowledge } from '../helpers/fakes';
import {
  clearCollections,
  setupTestMongo,
  teardownTestMongo,
} from '../helpers/mongo';

describe('report_gap Zod', () => {
  it('rejects need that is too short', () => {
    expect(reportGapArgsSchema.safeParse({ need: 'ab' }).success).toBe(false);
  });

  it('rejects need that is too long', () => {
    expect(
      reportGapArgsSchema.safeParse({ need: 'x'.repeat(201) }).success,
    ).toBe(false);
  });

  it('accepts trimmed need in range', () => {
    const r = reportGapArgsSchema.safeParse({ need: '  Parking: spaces  ' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.need).toBe('Parking: spaces');
    }
  });

  it('executeTool returns recorded without attachment', () => {
    const project = createFakeKnowledge().getProject('seven-towers');
    const result = executeTool(
      project,
      'report_gap',
      JSON.stringify({ need: 'Parking: spaces per unit' }),
    );
    expect(result.attachment).toBeNull();
    expect(result.toolResultText).toBe('recorded');
    expect(result.gapNeed).toBe('Parking: spaces per unit');
  });
});

describe('normalizeGapKey', () => {
  it('lowercases, strips punctuation, collapses spaces', () => {
    expect(normalizeGapKey('  Parking: Spaces!!  ')).toBe('parking spaces');
  });
});

describe('knowledge-gap.service persistence', () => {
  let mongoReady = false;

  beforeAll(async () => {
    mongoReady = await setupTestMongo();
  });

  afterAll(async () => {
    if (mongoReady) {
      await teardownTestMongo();
    }
  });

  beforeEach(async () => {
    resetGapDailyQuota();
    if (mongoReady) {
      await clearCollections();
    }
  });

  it('upserts, increments count, and stores asker name/email', async ({ skip }) => {
    if (!mongoReady) {
      skip();
    }
    const conversationId = new Types.ObjectId().toString();
    const base = {
      need: 'Parking: spaces in Tower B',
      userId: new Types.ObjectId().toString(),
      askerName: 'Ada Lovelace',
      askerEmail: 'ada@example.com',
      lastQuestion: 'How many parking spaces?',
      conversationId,
    };
    await recordKnowledgeGap(base);
    await recordKnowledgeGap({
      ...base,
      askerName: 'Grace Hopper',
      askerEmail: 'grace@example.com',
      lastQuestion: 'Parking again?',
    });

    const rows = await KnowledgeGap.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.count).toBe(2);
    expect(rows[0]?.lastQuestion).toBe('Parking again?');
    expect(rows[0]?.lastAskerName).toBe('Grace Hopper');
    expect(rows[0]?.lastAskerEmail).toBe('grace@example.com');
  });

  it('reopens resolved and leaves ignored alone', async ({ skip }) => {
    if (!mongoReady) {
      skip();
    }
    const conversationId = new Types.ObjectId().toString();
    const userId = new Types.ObjectId().toString();
    const need = 'Fees: maintenance monthly amount';
    const asker = {
      askerName: 'Test User',
      askerEmail: 'test@example.com',
    };

    await recordKnowledgeGap({
      need,
      userId,
      ...asker,
      lastQuestion: 'fees?',
      conversationId,
    });

    const gap = await KnowledgeGap.findOne({});
    expect(gap).toBeTruthy();
    gap!.status = 'resolved';
    gap!.resolvedAt = new Date();
    await gap!.save();

    await recordKnowledgeGap({
      need,
      userId,
      ...asker,
      lastQuestion: 'fees again',
      conversationId,
    });

    const reopened = await KnowledgeGap.findById(gap!._id).lean();
    expect(reopened?.status).toBe('open');
    expect(reopened?.reopenCount).toBe(1);
    expect(reopened?.count).toBe(2);

    await KnowledgeGap.updateOne(
      { _id: gap!._id },
      { $set: { status: 'ignored' } },
    );
    await recordKnowledgeGap({
      need,
      userId,
      ...asker,
      lastQuestion: 'still?',
      conversationId,
    });
    const ignored = await KnowledgeGap.findById(gap!._id).lean();
    expect(ignored?.status).toBe('ignored');
    expect(ignored?.count).toBe(3);
  });

  it('silently drops reports over the per-user daily cap', async ({ skip }) => {
    if (!mongoReady) {
      skip();
    }
    const userId = new Types.ObjectId().toString();
    const conversationId = new Types.ObjectId().toString();

    for (let i = 0; i < GAP_REPORTS_PER_DAY + 5; i += 1) {
      await recordKnowledgeGap({
        need: `Topic: missing detail number ${i}`,
        userId,
        askerName: 'Cap User',
        askerEmail: 'cap@example.com',
        lastQuestion: `q${i}`,
        conversationId,
      });
    }

    const count = await KnowledgeGap.countDocuments({});
    expect(count).toBe(GAP_REPORTS_PER_DAY);
  });
});
