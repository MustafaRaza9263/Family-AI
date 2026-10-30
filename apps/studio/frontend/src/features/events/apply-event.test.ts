import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ThreadDetailResponse } from '@studio/shared';
import { queryKeys } from '@/lib/query-keys';
import { applyStudioEvent } from './apply-event';
import { jobLiveKey } from './job-live';

function seedThread(client: QueryClient): void {
  const data: ThreadDetailResponse = {
    thread: {
      id: 't1',
      title: 'Hello',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    items: [
      {
        job: {
          id: 'j1',
          threadId: 't1',
          tool: 'image',
          status: 'queued',
          prompt: 'cat',
          params: {},
          inputAssetIds: [],
          outputAssetIds: [],
          timings: { queuedAt: '2026-01-01T00:00:00.000Z' },
        },
        assets: [],
      },
    ],
  };
  client.setQueryData(queryKeys.thread('t1'), data);
}

describe('applyStudioEvent', () => {
  it('updates queue position live state', () => {
    const client = new QueryClient();
    seedThread(client);
    applyStudioEvent(client, {
      type: 'job.queued',
      jobId: 'j1',
      threadId: 't1',
      position: 2,
    });
    expect(client.getQueryData(jobLiveKey('j1'))).toEqual({ position: 2 });
  });

  it('marks running on progress', () => {
    const client = new QueryClient();
    seedThread(client);
    applyStudioEvent(client, {
      type: 'job.progress',
      jobId: 'j1',
      stage: 'generating',
      value: 3,
      max: 10,
    });
    const thread = client.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('t1'),
    );
    expect(thread?.items[0]?.job.status).toBe('running');
    expect(client.getQueryData(jobLiveKey('j1'))).toMatchObject({
      stage: 'generating',
      progressValue: 3,
      progressMax: 10,
    });
  });

  it('sets done with asset ids and stub assets', () => {
    const client = new QueryClient();
    seedThread(client);
    applyStudioEvent(client, {
      type: 'job.done',
      jobId: 'j1',
      assetIds: ['a1'],
    });
    const thread = client.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('t1'),
    );
    expect(thread?.items[0]?.job.status).toBe('done');
    expect(thread?.items[0]?.job.outputAssetIds).toEqual(['a1']);
    expect(thread?.items[0]?.assets[0]?.id).toBe('a1');
  });

  it('sets failed and cancelled', () => {
    const client = new QueryClient();
    seedThread(client);
    applyStudioEvent(client, {
      type: 'job.failed',
      jobId: 'j1',
      errorCode: 'ENGINE_FAILED',
    });
    let thread = client.getQueryData<ThreadDetailResponse>(
      queryKeys.thread('t1'),
    );
    expect(thread?.items[0]?.job.errorCode).toBe('ENGINE_FAILED');

    applyStudioEvent(client, { type: 'job.cancelled', jobId: 'j1' });
    thread = client.getQueryData<ThreadDetailResponse>(queryKeys.thread('t1'));
    expect(thread?.items[0]?.job.status).toBe('cancelled');
  });

  it('updates engine state on capabilities', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.capabilities, {
      product: 'Family Studio',
      engine: { state: 'ready' },
      tools: [],
      limits: {
        image: { dailyRuns: 100, used: 0, remaining: 100 },
        video: { dailyRuns: 10, used: 0, remaining: 10 },
        activeCap: { running: 1, queued: 3 },
      },
    });
    applyStudioEvent(client, { type: 'engine', state: 'paused' });
    expect(
      (
        client.getQueryData(queryKeys.capabilities) as {
          engine: { state: string };
        }
      ).engine.state,
    ).toBe('paused');
  });
});
