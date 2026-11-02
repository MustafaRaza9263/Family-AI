import { describe, expect, it } from 'vitest';
import { cardState } from './components/generation-status';
import { videoStatusPlain } from './video-status';
import type { UserJob } from '@studio/shared';

function job(status: UserJob['status']): UserJob {
  return {
    id: 'j1',
    threadId: 't1',
    tool: 'video',
    status,
    prompt: 'walk',
    params: {},
    inputAssetIds: [],
    outputAssetIds: [],
    timings: { queuedAt: '2026-01-01T00:00:00.000Z' },
  };
}

describe('video card states', () => {
  it('queued copy includes the minutes hint', () => {
    expect(cardState(job('queued'))).toBe('queued');
    expect(videoStatusPlain('queued', 3)).toMatch(/few minutes/);
    expect(videoStatusPlain('queued', 3)).toMatch(/2 ahead/);
  });

  it('running stages show percentage like images', () => {
    expect(videoStatusPlain('preparing', undefined)).toBe('Warming up');
    expect(videoStatusPlain('generating', undefined, 42)).toBe(
      'Generating · 42%',
    );
    expect(videoStatusPlain('finishing', undefined)).toBe('Finishing');
  });

  it('maps failed and cancelled', () => {
    expect(cardState(job('failed'))).toBe('failed');
    expect(cardState(job('cancelled'))).toBe('cancelled');
    expect(videoStatusPlain('failed', undefined)).toMatch(/not counted/);
    expect(videoStatusPlain('failed', undefined, 0, true)).toMatch(
      /regenerate/,
    );
  });
});
