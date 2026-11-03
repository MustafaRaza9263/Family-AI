'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserJob } from '@studio/shared';
import { ListTodo, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  cardState,
  useLiveTimer,
} from '@/features/create/components/generation-status';
import { useCancelGeneration } from '@/features/create/hooks';
import { toolUi } from '@/features/create/tool-ui';
import { jobLiveKey, type JobLiveState } from '@/features/events/job-live';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/errors';

function QueueRow({
  job,
  index,
  onCancel,
}: {
  job: UserJob;
  index: number;
  onCancel: (id: string) => void;
}) {
  const router = useRouter();
  const ui = toolUi(job.tool);
  const Icon = ui.icon;
  const { data: live } = useQuery<JobLiveState>({
    queryKey: jobLiveKey(job.id),
    queryFn: () => ({}),
    staleTime: Infinity,
    enabled: job.status === 'queued' || job.status === 'running',
  });

  const state = cardState(job, live?.stage);
  const pct =
    live?.progressValue != null && live.progressMax
      ? Math.round((live.progressValue / live.progressMax) * 100)
      : 0;
  const timer = useLiveTimer(
    job.timings.startedAt,
    job.status === 'running',
  );
  const C = 2 * Math.PI * 9;
  const dash = (pct / 100) * C;
  const title = job.prompt.trim() || 'Untitled';

  return (
    <li
      className={cn(
        'flex min-h-9 flex-1 items-center gap-2 rounded-[9px] border border-border',
        'bg-surface-muted/60 pr-1 pl-1.5',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() =>
          router.push(`/create/?tool=${job.tool}&thread=${job.threadId}`)
        }
      >
        {job.status === 'running' ? (
          <svg className="size-[22px] shrink-0 -rotate-90" viewBox="0 0 22 22">
            <circle
              cx="11"
              cy="11"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-border"
            />
            <circle
              cx="11"
              cy="11"
              r="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-primary"
              style={{ strokeDasharray: `${dash} ${C}` }}
            />
          </svg>
        ) : (
          <span className="grid size-[22px] shrink-0 place-items-center rounded-[7px] border border-border font-mono text-[10.5px] font-semibold text-muted-foreground">
            #{live?.position ?? index + 1}
          </span>
        )}
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[12.5px] font-medium">{title}</b>
          <small className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Icon className="size-3" strokeWidth={1.8} />
            {job.status === 'running' ? (
              <>
                {state === 'generating'
                  ? 'Generating'
                  : state === 'finishing'
                    ? 'Finishing'
                    : 'Warming up'}
                {pct > 0 ? (
                  <span className="font-mono tabular-nums"> · {pct}%</span>
                ) : null}
                {timer ? (
                  <span className="font-mono tabular-nums"> · {timer}</span>
                ) : null}
              </>
            ) : (
              <>#{live?.position ?? index + 1} in line</>
            )}
          </small>
        </span>
      </button>
      <button
        type="button"
        className="grid size-[26px] shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
        aria-label="Cancel"
        data-tip="Cancel"
        onClick={() => onCancel(job.id)}
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

function EmptySlot({ index }: { index: number }) {
  return (
    <li
      className={cn(
        'flex min-h-9 flex-1 items-center gap-2 rounded-[9px] border border-dashed border-border',
        'px-2 text-muted-foreground',
      )}
    >
      <span className="grid size-[22px] shrink-0 place-items-center rounded-[7px] border border-border font-mono text-[10.5px] font-semibold">
        #{index + 1}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11.5px]">
        <ListTodo className="size-3.5 shrink-0" />
        Open slot
      </span>
    </li>
  );
}

export function QueuePanel({
  jobs,
  loading,
  slots,
}: {
  jobs: UserJob[];
  loading: boolean;
  /** Max concurrent jobs for this user (running + queued). */
  slots: number;
}) {
  const cancel = useCancelGeneration();
  const client = useQueryClient();
  const capacity = Math.max(1, slots);
  const shown = jobs.slice(0, capacity);
  const emptyCount = Math.max(0, capacity - shown.length);

  const onCancel = async (id: string) => {
    try {
      await cancel.mutateAsync(id);
      void client.invalidateQueries({ queryKey: ['thread'] });
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      toast.error(errorMessage(code));
    }
  };

  return (
    <section
      className="flex h-full min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-[var(--shadow-soft)]"
      aria-labelledby="home-queue"
    >
      <div className="flex h-4 items-center gap-2">
        <h2
          id="home-queue"
          className="m-0 text-xs font-semibold tracking-tight"
        >
          Your queue
        </h2>
        <span className="ml-auto font-mono text-[10.5px] tabular-nums text-muted-foreground">
          {shown.length}/{capacity}
        </span>
      </div>

      {loading ? <Skeleton className="h-20 w-full" /> : null}

      {!loading ? (
        <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1.5 p-0">
          {shown.map((job, i) => (
            <QueueRow
              key={job.id}
              job={job}
              index={i}
              onCancel={(id) => void onCancel(id)}
            />
          ))}
          {Array.from({ length: emptyCount }, (_, i) => (
            <EmptySlot key={`empty-${i}`} index={shown.length + i} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
