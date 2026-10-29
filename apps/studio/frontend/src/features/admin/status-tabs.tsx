'use client';

import type { UserStatus } from '@studio/shared';
import { cn } from '@/lib/cn';

export type StatusTab = UserStatus | 'all';

const LABELS: Record<StatusTab, string> = {
  pending: 'Pending',
  active: 'Active',
  disabled: 'Disabled',
  all: 'All',
};

export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: StatusTab;
  counts: { pending: number; active: number; disabled: number };
  onChange: (value: StatusTab) => void;
}) {
  const tabs: StatusTab[] = ['pending', 'active', 'disabled', 'all'];
  const all = counts.pending + counts.active + counts.disabled;

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="User status"
    >
      {tabs.map((tab) => {
        const count =
          tab === 'all'
            ? all
            : counts[tab];
        const active = value === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition duration-200',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-muted text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(tab)}
          >
            {LABELS[tab]}
            <span className="ml-1.5 opacity-80">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
