'use client';

/**
 * Admin overview: range switch + stat cards + recipe table + top errors/users.
 */

import { useState } from 'react';
import type { AdminStatsRange } from '@studio/shared';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDurationMs, formatPercent } from '@/lib/format';
import { useAdminStats } from './hooks';

// ---- range switch --------------------------------------------------------

const RANGES: AdminStatsRange[] = ['24h', '7d', '30d'];

function RangeSwitch({
  value,
  onChange,
}: {
  value: AdminStatsRange;
  onChange: (r: AdminStatsRange) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-[var(--radius-control)] border border-border bg-surface-muted p-1">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${
            r === value
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ---- stat card -----------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}

// ---- recipe table --------------------------------------------------------

function RecipeTable({ recipes }: { recipes: NonNullable<ReturnType<typeof useAdminStats>['data']>['recipes'] }) {
  if (recipes.length === 0) {
    return <p className="text-sm text-muted-foreground">No recipe data.</p>;
  }
  // Max p95 run time for normalising CSS bars.
  const maxP95 = Math.max(...recipes.map((r) => r.runMsP95 ?? 0), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Recipe</th>
            <th className="pb-2 pr-3 font-medium">Runs</th>
            <th className="pb-2 pr-3 font-medium">Success</th>
            <th className="pb-2 pr-3 font-medium">p50 / p95</th>
            <th className="pb-2 pr-3 font-medium">Cold med</th>
            <th className="pb-2 pr-3 font-medium">Warm med</th>
            <th className="pb-2 pr-3 font-medium">GPU avg</th>
            <th className="pb-2 pr-3 font-medium">Peak mem</th>
            <th className="pb-2 pr-3 font-medium">Max swap Δ</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((r) => {
            const barW = r.runMsP95 != null
              ? `${((r.runMsP95 / maxP95) * 100).toFixed(1)}%`
              : '0%';
            return (
              <tr key={r.recipeId} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-[10px]">{r.recipeId}</td>
                <td className="py-2 pr-3 tabular-nums">{r.runs}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.successRate != null ? formatPercent(r.successRate * 100) : '—'}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="tabular-nums">
                      {r.runMsP50 != null ? formatDurationMs(r.runMsP50) : '—'}
                      {' / '}
                      {r.runMsP95 != null ? formatDurationMs(r.runMsP95) : '—'}
                    </span>
                    {/* Inline CSS bar for p95 run time */}
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-primary/60" style={{ width: barW }} />
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.coldMedianRunMs != null ? formatDurationMs(r.coldMedianRunMs) : '—'}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.warmMedianRunMs != null ? formatDurationMs(r.warmMedianRunMs) : '—'}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.gpuUtilAvg != null ? formatPercent(r.gpuUtilAvg) : '—'}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.memUsedPeakMax != null ? `${(r.memUsedPeakMax / 1024).toFixed(1)} GB` : '—'}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.swapDeltaMax != null ? `${(r.swapDeltaMax / 1024).toFixed(1)} GB` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- main ----------------------------------------------------------------

export function OverviewPage() {
  const [range, setRange] = useState<AdminStatsRange>('24h');
  const { data, isLoading, isError } = useAdminStats(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Overview</h2>
        <RangeSwitch value={range} onChange={setRange} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <p className="text-sm text-danger">Could not load stats.</p>
      ) : null}

      {data ? (
        <>
          {data.truncated ? (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              Results may be truncated — large dataset.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total runs" value={String(data.counts.total)} />
            <StatCard
              label="Success rate"
              value={data.successRate != null ? formatPercent(data.successRate * 100) : '—'}
            />
            <StatCard label="Failed" value={String(data.counts.failed)} />
            <StatCard label="Cancelled" value={String(data.counts.cancelled)} />
            <StatCard
              label="Queue p50"
              value={data.queueWaitP50 != null ? formatDurationMs(data.queueWaitP50) : '—'}
            />
            <StatCard
              label="Queue p95"
              value={data.queueWaitP95 != null ? formatDurationMs(data.queueWaitP95) : '—'}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">By recipe</h3>
            <RecipeTable recipes={data.recipes} />
          </div>

          {data.topErrors.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Top errors</h3>
              <div className="space-y-1">
                {data.topErrors.map((e) => (
                  <div key={e.code} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <span className="font-mono text-danger">{e.code}</span>
                    <span className="tabular-nums text-muted-foreground">{e.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.topUsers.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Top users</h3>
              <div className="space-y-1">
                {data.topUsers.map((u) => (
                  <div key={u.userId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
                    <div>
                      <span className="font-medium">{u.fullName}</span>
                      <span className="ml-2 text-muted-foreground">{u.email}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{u.runs} runs</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.counts.total === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              No runs in the selected range.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
