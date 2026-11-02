import { describe, expect, it } from 'vitest';
import type { ThreadItem } from './version-groups';
import {
  activeAttempt,
  groupThreadItems,
  isRegenerating,
  keptVersions,
  liveAttempt,
} from './version-groups';

function item(
  id: string,
  status: ThreadItem['job']['status'],
): ThreadItem {
  return {
    job: {
      id,
      threadId: 't1',
      tool: 'image',
      status,
      prompt: 'hi',
      params: {},
      inputAssetIds: [],
      outputAssetIds: status === 'done' ? [`a-${id}`] : [],
      timings: { queuedAt: '2026-01-01T00:00:00.000Z' },
    },
    assets: [],
  };
}

describe('groupThreadItems', () => {
  it('keeps ungrouoped items as single-version cards', () => {
    const items = [item('a', 'done'), item('b', 'done')];
    expect(groupThreadItems(items, {})).toEqual([
      { rootId: 'a', versions: [items[0]] },
      { rootId: 'b', versions: [items[1]] },
    ]);
  });

  it('folds regenerate children under the root in order', () => {
    const items = [item('a', 'done'), item('b', 'done'), item('c', 'queued')];
    const groups = groupThreadItems(items, { b: 'a', c: 'a' });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.rootId).toBe('a');
    expect(groups[0]!.versions.map((v) => v.job.id)).toEqual(['a', 'b', 'c']);
  });

  it('resolves nested links to the same root', () => {
    const items = [item('a', 'done'), item('b', 'done')];
    const groups = groupThreadItems(items, { b: 'a' });
    expect(groups[0]!.versions.map((v) => v.job.id)).toEqual(['a', 'b']);
  });
});

describe('version helpers', () => {
  it('keptVersions only includes done', () => {
    const versions = [
      item('a', 'done'),
      item('b', 'failed'),
      item('c', 'done'),
    ];
    expect(keptVersions(versions).map((v) => v.job.id)).toEqual(['a', 'c']);
  });

  it('liveAttempt returns the latest non-done version', () => {
    const versions = [item('a', 'done'), item('b', 'running')];
    expect(liveAttempt(versions)?.job.id).toBe('b');
    expect(liveAttempt([item('a', 'done')])).toBeNull();
  });

  it('activeAttempt ignores failed/cancelled so Try again can run', () => {
    expect(activeAttempt([item('a', 'failed')])).toBeNull();
    expect(activeAttempt([item('a', 'cancelled')])).toBeNull();
    expect(activeAttempt([item('a', 'done'), item('b', 'queued')])?.job.id).toBe(
      'b',
    );
  });

  it('isRegenerating when a done version exists and a live attempt is open', () => {
    expect(isRegenerating([item('a', 'done'), item('b', 'queued')])).toBe(true);
    expect(isRegenerating([item('a', 'failed'), item('b', 'queued')])).toBe(
      false,
    );
  });
});
