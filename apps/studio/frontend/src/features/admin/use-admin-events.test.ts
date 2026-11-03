import { describe, expect, it } from 'vitest';
import {
  adminEventsReducer,
  type AdminEventsState,
} from './use-admin-events';

// Helper to build the initial state.
function initial(): AdminEventsState {
  return {
    connected: false,
    live: null,
    ring: { gpuUtil: [], memUsedMb: [] },
    jobEventCount: 0,
  };
}

// Minimal admin.live payload for tests.
function livePaylod(
  gpuUtilPct: number | null = 42,
  memUsedMb: number | null = 8192,
) {
  return {
    type: 'admin.live' as const,
    engine: 'ready' as const,
    queued: 0,
    running: null,
    hardware: gpuUtilPct === null && memUsedMb === null
      ? null
      : { at: '2026-11-03T06:00:00.000Z', gpuUtilPct, powerW: 120, tempC: 55, memUsedMb, memAvailableMb: 2048, swapUsedMb: 0, memTotalMb: 131072 },
  };
}

describe('adminEventsReducer', () => {
  it('starts disconnected with empty ring', () => {
    const s = initial();
    expect(s.connected).toBe(false);
    expect(s.ring.gpuUtil).toHaveLength(0);
  });

  it('sets connected on connected action', () => {
    const s = adminEventsReducer(initial(), { type: 'connected' });
    expect(s.connected).toBe(true);
  });

  it('sets disconnected on disconnected action', () => {
    const after = adminEventsReducer(
      { ...initial(), connected: true },
      { type: 'disconnected' },
    );
    expect(after.connected).toBe(false);
  });

  it('appends sample on live event', () => {
    const s = adminEventsReducer(initial(), {
      type: 'live',
      payload: livePaylod(50, 4096),
    });
    expect(s.ring.gpuUtil).toEqual([50]);
    expect(s.ring.memUsedMb).toEqual([4096]);
    expect(s.live).not.toBeNull();
  });

  it('stores null for missing hardware', () => {
    const s = adminEventsReducer(initial(), {
      type: 'live',
      payload: {
        type: 'admin.live',
        engine: 'ready',
        queued: 0,
        running: null,
        hardware: null,
      },
    });
    expect(s.ring.gpuUtil).toEqual([null]);
    expect(s.ring.memUsedMb).toEqual([null]);
  });

  it('caps ring buffer at 60 samples', () => {
    let s = initial();
    for (let i = 0; i < 65; i++) {
      s = adminEventsReducer(s, { type: 'live', payload: livePaylod(i, i * 10) });
    }
    expect(s.ring.gpuUtil).toHaveLength(60);
    // Most recent value should be the last written (64).
    expect(s.ring.gpuUtil[59]).toBe(64);
  });

  it('increments jobEventCount on job_event', () => {
    const s1 = adminEventsReducer(initial(), { type: 'job_event' });
    const s2 = adminEventsReducer(s1, { type: 'job_event' });
    expect(s2.jobEventCount).toBe(2);
  });

  it('does not change ring on non-live actions', () => {
    const pre = initial();
    const post = adminEventsReducer(pre, { type: 'connected' });
    // Ring reference identity preserved (nothing allocated).
    expect(post.ring).toBe(pre.ring);
  });
});
