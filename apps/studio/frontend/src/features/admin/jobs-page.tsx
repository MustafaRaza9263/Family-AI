'use client';

/**
 * Admin jobs page: filterable, cursor-paginated list/grid of all jobs.
 * Filters sync to URL. Debounced 500ms refetch on admin job.* SSE events.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAdminJobsInfinite } from './hooks';
import { JobDrawer } from './job-drawer';
import { JobRow, JobTile } from './job-row';
import { JobsFilterBar } from './jobs-filter-bar';
import { useAdminEventsState } from './admin-events-context';
import {
  filterFromParams,
  filterToParams,
  presetDateRange,
  type JobsFilter,
} from './jobs-url';

// We need Suspense boundary for useSearchParams in static export.
function JobsPageInner() {
  const { jobEventCount } = useAdminEventsState();

  const router = useRouter();
  const params = useSearchParams();

  const filter = useMemo(() => filterFromParams(params), [params]);
  const drawerJobId = params.get('job');

  // Merge date preset ranges into the query (presets override manual from/to).
  const effectiveFilter = useMemo((): JobsFilter => {
    if (filter.preset && filter.preset !== 'custom') {
      const range = presetDateRange(filter.preset);
      if (range) return { ...filter, from: range.from, to: range.to };
    }
    return filter;
  }, [filter]);

  // Debounce filter changes for text inputs (500ms).
  const [debouncedFilter, setDebouncedFilter] = useState(effectiveFilter);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedFilter(effectiveFilter);
    }, 500);
    return () => clearTimeout(debounceTimer.current);
  }, [effectiveFilter]);

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useAdminJobsInfinite(debouncedFilter);

  // Debounced refetch on job SSE events.
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (jobEventCount === 0) return;
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => void refetch(), 500);
    return () => clearTimeout(refetchTimer.current);
  }, [jobEventCount, refetch]);

  const pushFilter = useCallback(
    (patch: Partial<JobsFilter>) => {
      const next = { ...filter, ...patch };
      const p = filterToParams(next);
      // Preserve ?job= param so the drawer stays open through filter changes.
      if (drawerJobId) p.set('job', drawerJobId);
      router.replace(`/admin/jobs/?${p.toString()}`);
    },
    [filter, drawerJobId, router],
  );

  const openDrawer = useCallback(
    (jobId: string) => {
      const p = filterToParams(filter);
      p.set('job', jobId);
      router.replace(`/admin/jobs/?${p.toString()}`);
    },
    [filter, router],
  );

  const closeDrawer = useCallback(() => {
    const p = filterToParams(filter);
    p.delete('job');
    router.replace(`/admin/jobs/?${p.toString()}`);
  }, [filter, router]);

  const allJobs = data?.pages.flatMap((p) => p.items) ?? [];
  const isListView = filter.view !== 'grid';

  return (
    <div className="space-y-4">
      <JobsFilterBar filter={filter} onChange={pushFilter} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <EmptyState
          title="Could not load jobs"
          description="Check the connection and try again."
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      {!isLoading && !isError && allJobs.length === 0 ? (
        <EmptyState
          title="No jobs"
          description="Try adjusting the filters."
        />
      ) : null}

      {allJobs.length > 0 ? (
        <>
          {isListView ? (
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-border">
              <table className="w-full">
                <thead className="bg-surface-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2 pl-3 pr-2 text-left font-medium" />
                    <th className="py-2 pr-3 text-left font-medium">Prompt</th>
                    <th className="py-2 pr-3 text-left font-medium">User</th>
                    <th className="py-2 pr-3 text-left font-medium">Recipe</th>
                    <th className="py-2 pr-3 text-left font-medium">Status</th>
                    <th className="py-2 pr-3 text-left font-medium">Q-wait</th>
                    <th className="py-2 pr-3 text-left font-medium">Run</th>
                    <th className="py-2 pr-3 text-left font-medium">Warm</th>
                    <th className="py-2 pr-3 text-left font-medium">GPU pk</th>
                    <th className="py-2 pr-3 text-left font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allJobs.map((job) => (
                    <JobRow key={job.id} job={job} onClick={() => openDrawer(job.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {allJobs.map((job) => (
                <JobTile key={job.id} job={job} onClick={() => openDrawer(job.id)} />
              ))}
            </div>
          )}

          {hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                loading={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <JobDrawer jobId={drawerJobId} onClose={closeDrawer} />
    </div>
  );
}

export function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      }
    >
      <JobsPageInner />
    </Suspense>
  );
}
