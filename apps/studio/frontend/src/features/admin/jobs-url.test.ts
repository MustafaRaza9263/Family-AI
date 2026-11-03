import { describe, expect, it } from 'vitest';
import {
  filterFromParams,
  filterToParams,
  filterToQuery,
  presetDateRange,
  type JobsFilter,
} from './jobs-url';

const DEFAULT: JobsFilter = {
  status: '',
  tool: '',
  recipe: '',
  user: '',
  q: '',
  preset: '',
  from: '',
  to: '',
  view: 'list',
};

describe('filterFromParams', () => {
  it('returns defaults when empty', () => {
    expect(filterFromParams(new URLSearchParams())).toEqual(DEFAULT);
  });

  it('reads all filter keys', () => {
    const p = new URLSearchParams(
      'status=done&tool=video&recipe=video-from-text&user=u1&q=cat&preset=7d&from=2026-01-01T00:00:00.000Z&to=2026-01-08T00:00:00.000Z&view=grid',
    );
    const f = filterFromParams(p);
    expect(f.status).toBe('done');
    expect(f.tool).toBe('video');
    expect(f.recipe).toBe('video-from-text');
    expect(f.user).toBe('u1');
    expect(f.q).toBe('cat');
    expect(f.preset).toBe('7d');
    expect(f.view).toBe('grid');
  });

  it('defaults view to list for unknown value', () => {
    const f = filterFromParams(new URLSearchParams('view=table'));
    expect(f.view).toBe('list');
  });
});

describe('filterToParams → filterFromParams round-trip', () => {
  it('round-trips a populated filter', () => {
    const f: JobsFilter = {
      status: 'failed',
      tool: 'image',
      recipe: 'image-create-fast',
      user: 'u42',
      q: 'sunset',
      preset: 'today',
      from: '',
      to: '',
      view: 'grid',
    };
    const params = filterToParams(f);
    expect(filterFromParams(params)).toEqual(f);
  });

  it('omits falsy values from params', () => {
    const params = filterToParams(DEFAULT);
    expect(params.toString()).toBe('');
  });
});

describe('filterToQuery', () => {
  it('maps filter to API query', () => {
    const f: JobsFilter = { ...DEFAULT, status: 'done', tool: 'video', q: 'x' };
    const q = filterToQuery(f);
    expect(q.status).toBe('done');
    expect(q.tool).toBe('video');
    expect(q.q).toBe('x');
    expect(q.cursor).toBeUndefined();
    expect(q.limit).toBe(30);
  });

  it('forwards cursor', () => {
    expect(filterToQuery(DEFAULT, 'abc').cursor).toBe('abc');
  });
});

describe('presetDateRange', () => {
  const now = new Date('2026-11-03T12:00:00.000Z');

  it('returns null for empty preset', () => {
    expect(presetDateRange('', now)).toBeNull();
  });

  it('returns null for custom', () => {
    expect(presetDateRange('custom', now)).toBeNull();
  });

  it('today starts at midnight', () => {
    const range = presetDateRange('today', now)!;
    expect(range.from).toMatch(/T00:00:00/);
    expect(range.to).toBe(now.toISOString());
  });

  it('7d is 7 days before now', () => {
    const range = presetDateRange('7d', now)!;
    const diff = now.getTime() - new Date(range.from).getTime();
    expect(diff).toBe(7 * 86_400_000);
  });

  it('30d is 30 days before now', () => {
    const range = presetDateRange('30d', now)!;
    const diff = now.getTime() - new Date(range.from).getTime();
    expect(diff).toBe(30 * 86_400_000);
  });
});
