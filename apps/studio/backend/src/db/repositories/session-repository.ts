export type SessionRecord = {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

export type CreateSessionInput = {
  tokenHash: string;
  userId: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

export interface SessionRepository {
  create(input: CreateSessionInput): Promise<SessionRecord>;
  findByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  touch(
    id: string,
    lastSeenAt: Date,
    expiresAt: Date,
  ): Promise<void>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}
