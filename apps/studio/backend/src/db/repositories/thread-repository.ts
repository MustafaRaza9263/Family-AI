export type ThreadRecord = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type CreateThreadInput = {
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ListThreadsOpts = {
  userId: string;
  limit: number;
  /** Exclusive: rows strictly older than this (updatedAt,id). */
  before?: { updatedAt: Date; id: string };
};

export interface ThreadRepository {
  create(input: CreateThreadInput): Promise<ThreadRecord>;
  findById(id: string): Promise<ThreadRecord | null>;
  findByIdForUser(id: string, userId: string): Promise<ThreadRecord | null>;
  listForUser(opts: ListThreadsOpts): Promise<ThreadRecord[]>;
  setTitle(id: string, title: string, at: Date): Promise<void>;
  touchUpdatedAt(id: string, at: Date): Promise<void>;
  softDelete(id: string, at: Date): Promise<void>;
}
