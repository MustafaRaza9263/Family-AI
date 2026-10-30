import { describe, expect, it } from 'vitest';
import { orderQueue } from '../../src/queue/scheduler.js';

function job(
  id: string,
  userId: string,
  tool: 'image' | 'video',
  queuedAtMs: number,
) {
  return { id, userId, tool, timings: { queuedAt: new Date(queuedAtMs) } };
}

describe('orderQueue', () => {
  it('puts images before videos', () => {
    const ordered = orderQueue(
      [
        job('v1', 'a', 'video', 1),
        job('i1', 'a', 'image', 2),
      ],
      new Map(),
    );
    expect(ordered.map((j) => j.id)).toEqual(['i1', 'v1']);
  });

  it('round-robins across users by least-recently-served', () => {
    const lastServedAt = new Map<string, number>([
      ['a', 100],
      ['b', 50],
    ]);
    const ordered = orderQueue(
      [
        job('a1', 'a', 'image', 1),
        job('a2', 'a', 'image', 2),
        job('b1', 'b', 'image', 3),
      ],
      lastServedAt,
    );
    expect(ordered.map((j) => j.id)).toEqual(['b1', 'a1', 'a2']);
  });

  it('keeps oldest job first within a user', () => {
    const ordered = orderQueue(
      [
        job('a2', 'a', 'image', 20),
        job('a1', 'a', 'image', 10),
      ],
      new Map(),
    );
    expect(ordered.map((j) => j.id)).toEqual(['a1', 'a2']);
  });
});
