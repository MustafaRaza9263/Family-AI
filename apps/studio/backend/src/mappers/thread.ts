import type { ThreadDto } from '@studio/shared';
import type { ThreadRecord } from '../db/repositories/thread-repository.js';

export function toThreadDto(thread: ThreadRecord): ThreadDto {
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
  };
}
