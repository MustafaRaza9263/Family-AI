'use client';

/**
 * Metrics sections for the job drawer:
 * timing bar, phase bar, node waterfall, hardware tiles, raw JSON.
 */

import { useState } from 'react';
import type { AdminJobDetail } from '@studio/shared';
import { cn } from '@/lib/cn';
import { formatDurationMs, formatMbAsGb, formatPercent, formatWatts } from '@/lib/format';
import { getWarmCold } from './job-warm';

// ---- timing bar ----------------------------------------------------------

export function TimingBar({ job }: { job: AdminJobDetail }) {
  const qw = job.queueWaitMs ?? 0;
  const rt = job.runMs ?? 0;
  const total = qw + rt;
  if (total === 0) return null;
  const qPct = ((qw / total) * 100).toFixed(1);
  const rPct = ((rt / total) * 100).toFixed(1);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Timing</p>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div
          style={{ width: `${qPct}%` }}
          className="bg-warning/70"
          title={`Queue wait: ${formatDurationMs(qw)}`}
        />
        <div
          style={{ width: `${rPct}%` }}
          className="bg-primary/70"
          title={`Run: ${formatDurationMs(rt)}`}
        />
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span><span className="inline-block size-2 rounded-full bg-warning/70 mr-1" />Queue {formatDurationMs(qw)}</span>
        <span><span className="inline-block size-2 rounded-full bg-primary/70 mr-1" />Run {formatDurationMs(rt)}</span>
      </div>
    </div>
  );
}

// ---- phase bar -----------------------------------------------------------

const PHASE_COLORS = ['bg-yellow-500', 'bg-primary', 'bg-success', 'bg-purple-500', 'bg-muted-foreground'];
const PHASE_LABELS = ['Load', 'Sample', 'Decode', 'Enhance', 'Other'];

export function PhaseBar({ phases }: { phases: AdminJobDetail['metricsFull'] extends null | undefined ? never : AdminJobDetail['metricsFull'] extends null ? never : NonNullable<AdminJobDetail['metricsFull']>['phases'] }) {
  const vals = [
    phases.loadMs,
    phases.sampleMs,
    phases.decodeMs,
    phases.enhanceMs ?? 0,
    phases.otherMs,
  ];
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Phases</p>
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {vals.map((ms, i) => {
          if (ms === 0) return null;
          const pct = ((ms / total) * 100).toFixed(1);
          return (
            <div
              key={i}
              style={{ width: `${pct}%` }}
              className={PHASE_COLORS[i]}
              title={`${PHASE_LABELS[i]}: ${formatDurationMs(ms)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {vals.map((ms, i) => {
          if (ms === 0) return null;
          return (
            <span key={i}>
              <span className={cn('inline-block size-2 rounded-full mr-1', PHASE_COLORS[i])} />
              {PHASE_LABELS[i]} {formatDurationMs(ms)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ---- node waterfall ------------------------------------------------------

export function NodeWaterfall({ nodes }: { nodes: NonNullable<AdminJobDetail['metricsFull']>['nodes'] }) {
  if (nodes.length === 0) return null;
  const maxMs = Math.max(...nodes.map((n) => n.ms), 1);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Nodes</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="py-1 pr-2 text-left font-medium">Class</th>
              <th className="py-1 pr-2 text-left font-medium">ms</th>
              <th className="py-1 w-32 text-left font-medium">Bar</th>
              <th className="py-1 text-left font-medium">Cached</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n, i) => (
              // Comfy can emit the same nodeId more than once (e.g. cache then run).
              <tr key={`${n.nodeId}-${i}`} className="border-t border-border/50">
                <td className="py-1 pr-2 font-mono text-[10px] leading-tight">{n.title ?? n.class}</td>
                <td className="py-1 pr-2 tabular-nums">{formatDurationMs(n.ms)}</td>
                <td className="py-1 pr-2">
                  <div className="h-2 w-32 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', n.cached ? 'bg-success/50' : 'bg-primary/60')}
                      style={{ width: `${((n.ms / maxMs) * 100).toFixed(1)}%` }}
                    />
                  </div>
                </td>
                <td className="py-1 text-muted-foreground">{n.cached ? '✓' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- hardware tiles ------------------------------------------------------

export function HardwareTiles({ hw }: { hw: NonNullable<AdminJobDetail['metricsFull']>['hardware'] }) {
  const warmCold = getWarmCold(null); // just for the pattern — actual badge is in drawer
  const tiles = [
    { label: 'GPU avg', value: hw.gpuUtilAvg != null ? formatPercent(hw.gpuUtilAvg) : 'n/a' },
    { label: 'GPU peak', value: hw.gpuUtilPeak != null ? formatPercent(hw.gpuUtilPeak) : 'n/a' },
    { label: 'Power avg', value: hw.powerAvgW != null ? formatWatts(hw.powerAvgW) : 'n/a' },
    { label: 'Power peak', value: hw.powerPeakW != null ? formatWatts(hw.powerPeakW) : 'n/a' },
    { label: 'Temp peak', value: hw.tempPeakC != null ? `${Math.round(hw.tempPeakC)}°C` : 'n/a' },
    { label: 'Mem avg', value: hw.memUsedAvgMb != null ? formatMbAsGb(hw.memUsedAvgMb) : 'n/a' },
    { label: 'Mem peak', value: hw.memUsedPeakMb != null ? formatMbAsGb(hw.memUsedPeakMb) : 'n/a' },
    { label: 'Swap Δ', value: hw.swapUsedStartMb != null && hw.swapUsedPeakMb != null ? formatMbAsGb(Math.max(0, hw.swapUsedPeakMb - hw.swapUsedStartMb)) : 'n/a' },
  ];
  void warmCold; // suppress unused warning
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Hardware</p>
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-border bg-surface-muted px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground">{t.label}</p>
            <p className="text-xs font-medium tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- raw JSON collapsible ------------------------------------------------

export function RawJsonSection({ data }: { data: unknown }) {
  const [open, setOpen] = useState(false);
  const json = JSON.stringify(data, null, 2);

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground transition"
      >
        {open ? '▾' : '▸'} Raw JSON
      </button>
      {open ? (
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(json)}
            className="absolute top-1 right-1 rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Copy
          </button>
          <pre className="overflow-x-auto rounded-lg bg-surface-muted p-3 text-[10px] leading-relaxed">
            {json}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
