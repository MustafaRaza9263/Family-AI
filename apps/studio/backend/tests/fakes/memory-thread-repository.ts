import { randomUUID } from 'node:crypto';
import type {
  CreateThreadInput,
  ListThreadsOpts,
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

  async listForUser(opts: ListThreadsOpts): Promise<ThreadRecord[]> {
    let rows = [...this.threads.values()].filter(
      (t) => t.userId === opts.userId && !t.deletedAt,
    );
    rows.sort((a, b) => {
      const dt = b.updatedAt.getTime() - a.updatedAt.getTime();
      if (dt !== 0) return dt;
      return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
    });
    const before = opts.before;
    if (before) {
      rows = rows.filter((t) => {
        const ut = t.updatedAt.getTime();
        const bt = before.updatedAt.getTime();
        return ut < bt || (ut === bt && t.id < before.id);
      });
    }
    return rows.slice(0, opts.limit).map((t) => ({ ...t }));
  }

  async setTitle(id: string, title: string, at: Date): Promise<void> {
    const t = this.threads.get(id);
    if (t) {
      t.title = title;
      t.updatedAt = at;
    }
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
