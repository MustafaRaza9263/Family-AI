import { randomUUID } from 'node:crypto';
import type {
  CreateSessionInput,
  SessionRecord,
  SessionRepository,
} from '../../src/db/repositories/session-repository.js';

export class MemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionRecord>();

  async create(input: CreateSessionInput): Promise<SessionRecord> {
    const record: SessionRecord = {
      id: randomUUID(),
      tokenHash: input.tokenHash,
      userId: input.userId,
      createdAt: input.createdAt,
      lastSeenAt: input.lastSeenAt,
      expiresAt: input.expiresAt,
    };
    this.sessions.set(record.id, record);
    return { ...record };
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenHash === tokenHash) {
        return { ...session };
      }
    }
    return null;
  }

  async touch(id: string, lastSeenAt: Date, expiresAt: Date): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.lastSeenAt = lastSeenAt;
      session.expiresAt = expiresAt;
    }
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.tokenHash === tokenHash) {
        this.sessions.delete(id);
        return;
      }
    }
  }

  async deleteAllForUser(userId: string): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(id);
      }
    }
  }

  countForUser(userId: string): number {
    let n = 0;
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        n += 1;
      }
    }
    return n;
  }
}
