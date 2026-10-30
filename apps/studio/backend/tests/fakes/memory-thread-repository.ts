import { randomUUID } from 'node:crypto';
import type {
  CreateThreadInput,
  ThreadRecord,
  ThreadRepository,
} from '../../src/db/repositories/thread-repository.js';

export class MemoryThreadRepository implements ThreadRepository {
  private readonly threads = new Map<string, ThreadRecord>();

  async create(input: CreateThreadInput): Promise<ThreadRecord> {
    const record: ThreadRecord = {
      id: randomUUID(),
      userId: input.userId,
      title: input.title,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
    this.threads.set(record.id, record);
    return { ...record };
  }

  async findById(id: string): Promise<ThreadRecord | null> {
    const t = this.threads.get(id);
    if (!t || t.deletedAt) return null;
    return { ...t };
  }

  async findByIdForUser(
    id: string,
    userId: string,
  ): Promise<ThreadRecord | null> {
    const t = this.threads.get(id);
    if (!t || t.deletedAt || t.userId !== userId) return null;
    return { ...t };
  }

  async touchUpdatedAt(id: string, at: Date): Promise<void> {
    const t = this.threads.get(id);
    if (t) t.updatedAt = at;
  }

  async softDelete(id: string, at: Date): Promise<void> {
    const t = this.threads.get(id);
    if (t) {
      t.deletedAt = at;
      t.updatedAt = at;
    }
  }
}
