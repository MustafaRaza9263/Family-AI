import type { QueryClient } from '@tanstack/react-query';
import type {
  AssetDto,
  CapabilitiesResponse,
  StudioEvent,
  ThreadDetailResponse,
  UserJob,
} from '@studio/shared';
import { queryKeys } from '@/lib/query-keys';
import { jobLiveKey, type JobLiveState } from './job-live';

function patchThreadItem(
  client: QueryClient,
  jobId: string,
  patch: { job?: Partial<UserJob>; assets?: AssetDto[] },
): void {
  const entries = client.getQueriesData<ThreadDetailResponse>({
    queryKey: ['thread'],
  });
  for (const [key, data] of entries) {
    if (!data) continue;
    const idx = data.items.findIndex((i) => i.job.id === jobId);
    if (idx < 0) continue;
    const item = data.items[idx]!;
    const nextItems = data.items.slice();
    nextItems[idx] = {
      ...item,
      job: patch.job ? { ...item.job, ...patch.job } : item.job,
      assets: patch.assets ?? item.assets,
    };
    client.setQueryData(key, { ...data, items: nextItems });
  }
}

function patchLive(
  client: QueryClient,
  jobId: string,
  patch: JobLiveState,
): void {
  client.setQueryData<JobLiveState>(jobLiveKey(jobId), (prev) => ({
    ...prev,
    ...patch,
  }));
}

/** Placeholder assets so the card can render immediately from job.done. */
function stubAssets(assetIds: string[]): AssetDto[] {
  const now = new Date().toISOString();
  return assetIds.map((id) => ({
    id,
    kind: 'image',
    mime: 'image/png',
    bytes: 0,
    width: 1,
    height: 1,
    source: 'generated',
    createdAt: now,
  }));
}

/** Apply one SSE event into the TanStack Query cache. */
export function applyStudioEvent(
  client: QueryClient,
  event: StudioEvent,
): void {
  switch (event.type) {
    case 'job.queued':
      patchThreadItem(client, event.jobId, { job: { status: 'queued' } });
      patchLive(client, event.jobId, { position: event.position });
      break;
    case 'job.position':
      patchLive(client, event.jobId, { position: event.position });
      break;
    case 'job.started':
      patchThreadItem(client, event.jobId, { job: { status: 'running' } });
      break;
    case 'job.progress':
      patchThreadItem(client, event.jobId, { job: { status: 'running' } });
      patchLive(client, event.jobId, {
        stage: event.stage,
        progressValue: event.value,
        progressMax: event.max,
      });
      break;
    case 'job.done':
      patchThreadItem(client, event.jobId, {
        job: { status: 'done', outputAssetIds: event.assetIds },
        assets: stubAssets(event.assetIds),
      });
      void client.invalidateQueries({ queryKey: ['thread'] });
      void client.invalidateQueries({ queryKey: ['library'] });
      void client.invalidateQueries({ queryKey: ['threads'] });
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
      break;
    case 'job.failed':
      patchThreadItem(client, event.jobId, {
        job: { status: 'failed', errorCode: event.errorCode },
      });
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
      break;
    case 'job.cancelled':
      patchThreadItem(client, event.jobId, { job: { status: 'cancelled' } });
      void client.invalidateQueries({ queryKey: queryKeys.capabilities });
      break;
    case 'engine':
      client.setQueryData<CapabilitiesResponse>(
        queryKeys.capabilities,
        (prev) =>
          prev ? { ...prev, engine: { state: event.state } } : prev,
      );
      break;
  }
}
