'use client';

/**
 * Filter bar for the admin jobs page.
 * Stateless — reads filter from props, fires onChange.
 */

import { LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { JobsFilter } from './jobs-url';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'running', label: 'Running' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TOOL_OPTIONS = [
  { value: '', label: 'All tools' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
];

const DATE_PRESETS: { value: JobsFilter['preset']; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            o.value === value
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type Props = {
  filter: JobsFilter;
  onChange: (patch: Partial<JobsFilter>) => void;
};

export function JobsFilterBar({ filter, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: status chips + tool chips + list/grid toggle */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChipGroup
          options={STATUS_OPTIONS as { value: string; label: string }[]}
          value={filter.status}
          onChange={(v) => onChange({ status: v })}
        />
        <div className="h-4 w-px bg-border" />
        <ChipGroup
          options={TOOL_OPTIONS as { value: string; label: string }[]}
          value={filter.tool}
          onChange={(v) => onChange({ tool: v })}
        />
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            aria-label="List view"
            onClick={() => onChange({ view: 'list' })}
            className={`grid size-8 place-items-center rounded-lg transition ${filter.view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => onChange({ view: 'grid' })}
            className={`grid size-8 place-items-center rounded-lg transition ${filter.view === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      {/* Row 2: text search inputs + date presets */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filter.user}
          onChange={(e) => onChange({ user: e.target.value })}
          placeholder="User search"
          aria-label="Filter by user"
          className="w-36"
        />
        <Input
          value={filter.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Prompt search"
          aria-label="Filter by prompt"
          className="w-44"
        />
        <Input
          value={filter.recipe}
          onChange={(e) => onChange({ recipe: e.target.value })}
          placeholder="Recipe id"
          aria-label="Filter by recipe"
          className="w-36"
        />
        <div className="h-4 w-px bg-border" />
        <ChipGroup
          options={DATE_PRESETS as { value: string; label: string }[]}
          value={filter.preset}
          onChange={(v) => onChange({ preset: v as JobsFilter['preset'] })}
        />
      </div>
    </div>
  );
}
