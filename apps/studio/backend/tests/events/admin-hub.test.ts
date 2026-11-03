import { afterEach, describe, expect, it, vi } from 'vitest';
import { wireAdminLive } from '../../src/events/admin-live.js';
import { createEventHub } from '../../src/events/hub.js';
import type { HardwareSample, Telemetry } from '../../src/telemetry/types.js';

function fakeTelemetry(samples: HardwareSample[]): Telemetry {
  return {
    runStart: () => undefined,
    runEvent: () => undefined,
    runEnd: () => undefined,
    snapshot: () => null,
    watch(listener) {
      for (const s of samples) listener(s);
      return () => undefined;
    },
    flush: async () => undefined,
  };
}

describe('admin hub fan-out', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fans user events to admins with userId and caps at 3 conns/user', () => {
    const hub = createEventHub();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      hub.subscribeAdmin('admin1', (ev) => {
        if (ev.type === 'job.started') seen.push(`${i}:${ev.jobId}:${ev.userId}`);
      });
    }
    expect(hub.adminConnectionCount()).toBe(3);
    hub.publish('u1', { type: 'job.started', jobId: 'j1' });
    expect(seen.some((s) => s.endsWith('j1:u1'))).toBe(true);
    hub.close();
  });

  it('starts and stops the admin.live loop with connection count', async () => {
    vi.useFakeTimers();
    const hub = createEventHub();
    const lives: unknown[] = [];
    const sample: HardwareSample = {
      at: new Date('2026-11-01T00:00:00.000Z'),
      gpuUtilPct: 42,
      powerW: 110,
      tempC: 58,
      memUsedMb: 8000,
      memAvailableMb: 12000,
      swapUsedMb: 50,
      memTotalMb: 24000,
    };

    wireAdminLive({
      hub,
      telemetry: fakeTelemetry([sample]),
      getEngineState: () => 'ready',
      getQueuedCount: async () => 2,
      getCurrent: () => null,
      resolveUserName: async () => 'Nobody',
    });

    const unsub = hub.subscribeAdmin('admin1', (ev) => {
      if (ev.type === 'admin.live') lives.push(ev);
    });
    await vi.advanceTimersByTimeAsync(1100);
    expect(lives.length).toBeGreaterThanOrEqual(1);
    const first = lives[0] as { queued: number; hardware: { gpuUtilPct: number } | null };
    expect(first.queued).toBe(2);
    expect(first.hardware?.gpuUtilPct).toBe(42);

    unsub();
    const before = lives.length;
    await vi.advanceTimersByTimeAsync(2000);
    expect(lives.length).toBe(before);
    hub.close();
  });
});
