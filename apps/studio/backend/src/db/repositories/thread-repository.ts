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

export interface ThreadRepository {
  create(input: CreateThreadInput): Promise<ThreadRecord>;
  findById(id: string): Promise<ThreadRecord | null>;
  findByIdForUser(id: string, userId: string): Promise<ThreadRecord | null>;
  touchUpdatedAt(id: string, at: Date): Promise<void>;
  softDelete(id: string, at: Date): Promise<void>;
}
