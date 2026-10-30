import { describe, expect, it } from 'vitest';
import type { JobRecord } from '../../src/db/repositories/job-repository.js';
import { toAdminJob, toUserJob } from '../../src/mappers/job.js';

function sampleJob(): JobRecord {
  return {
    id: 'job1',
    userId: 'user1',
    threadId: 'thread1',
    tool: 'image',
    recipeId: 'image-create-fast',
    variant: 'fast',
    status: 'queued',
    prompt: 'hello',
    params: { aspectRatio: '1:1' },
    inputAssetIds: [],
    outputAssetIds: [],
    attempts: 0,
    timings: { queuedAt: new Date('2026-10-30T12:00:00.000Z') },
  };
}

describe('job mappers', () => {
  it('toUserJob omits recipeId and attempts', () => {
    const dto = toUserJob(sampleJob());
    expect(dto).not.toHaveProperty('recipeId');
    expect(dto).not.toHaveProperty('userId');
    expect(dto).not.toHaveProperty('attempts');
    expect(dto.prompt).toBe('hello');
  });

  it('toAdminJob includes recipeId', () => {
    const dto = toAdminJob(sampleJob());
    expect(dto.recipeId).toBe('image-create-fast');
    expect(dto.userId).toBe('user1');
    expect(dto.attempts).toBe(0);
  });
});
