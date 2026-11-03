/**
 * Pure functions for converting between URL search params and the jobs-page
 * filter state.  Kept separate so they can be unit-tested without a DOM.
 */

import type { AdminJobsQuery } from '@studio/shared';

export type JobsFilter = {
  status: string;
  tool: string;
  recipe: string;
  user: string;
  q: string;
  preset: 'today' | '7d' | '30d' | 'custom' | '';
  from: string;
  to: string;
  view: 'list' | 'grid';
};

export function filterFromParams(params: URLSearchParams): JobsFilter {
  return {
    status: params.get('status') ?? '',
    tool: params.get('tool') ?? '',
    recipe: params.get('recipe') ?? '',
    user: params.get('user') ?? '',
    q: params.get('q') ?? '',
    preset: (params.get('preset') as JobsFilter['preset']) ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    view: params.get('view') === 'grid' ? 'grid' : 'list',
  };
}

export function filterToParams(f: JobsFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.status) p.set('status', f.status);
  if (f.tool) p.set('tool', f.tool);
  if (f.recipe) p.set('recipe', f.recipe);
  if (f.user) p.set('user', f.user);
  if (f.q) p.set('q', f.q);
  if (f.preset) p.set('preset', f.preset);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.view === 'grid') p.set('view', 'grid');
  return p;
}

/** Map the UI filter state to the API query object (drops empty values). */
export function filterToQuery(
  f: JobsFilter,
  cursor?: string,
): AdminJobsQuery {
  const q: AdminJobsQuery = { limit: 30 };
  if (f.status) q.status = f.status as AdminJobsQuery['status'];
  if (f.tool) q.tool = f.tool as AdminJobsQuery['tool'];
  if (f.recipe) q.recipe = f.recipe;
  if (f.user) q.user = f.user;
  if (f.q) q.q = f.q;
  if (f.from) q.from = f.from;
  if (f.to) q.to = f.to;
  if (cursor) q.cursor = cursor;
  return q;
}

/** ISO 8601 boundary for named presets relative to `now`. */
export function presetDateRange(
  preset: JobsFilter['preset'],
  now = new Date(),
): { from: string; to: string } | null {
  if (!preset || preset === 'custom') return null;
  const to = now.toISOString();
  if (preset === 'today') {
    // UTC midnight so the filter is consistent regardless of server timezone.
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { from: start.toISOString(), to };
  }
  if (preset === '7d') {
    return { from: new Date(now.getTime() - 7 * 86_400_000).toISOString(), to };
  }
  if (preset === '30d') {
    return {
      from: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
      to,
    };
  }
  return null;
}
