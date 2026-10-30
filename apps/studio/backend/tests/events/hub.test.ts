import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEventHub } from '../../src/events/hub.js';

describe('event hub', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caps connections at 5 and drops the oldest', () => {
    const hub = createEventHub();
    const closed: string[] = [];
    for (let i = 0; i < 6; i++) {
      const id = String(i);
      hub.subscribe('u1', (ev) => {
        if (ev.type === 'job.started' && ev.jobId === id) closed.push(id);
      });
    }
    expect(hub.connectionCount('u1')).toBe(5);
    // First subscriber was dropped; only ids 1..5 remain.
    hub.publish('u1', { type: 'job.started', jobId: '0' });
    hub.publish('u1', { type: 'job.started', jobId: '5' });
    expect(closed).toEqual(['5']);
    hub.close();
  });

  it('emits heartbeat comments on the interval', () => {
    vi.useFakeTimers();
    const hub = createEventHub();
    const beats: string[] = [];
    hub.subscribe('u1', (ev) => {
      if (ev.type === 'heartbeat') beats.push('beat');
    });
    vi.advanceTimersByTime(25_000);
    expect(beats).toEqual(['beat']);
    hub.close();
  });
});
