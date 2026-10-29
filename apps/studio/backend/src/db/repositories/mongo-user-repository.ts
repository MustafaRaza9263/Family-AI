import {
  MongoServerError,
  ObjectId,
  type Collection,
  type Db,
  type Filter,
} from 'mongodb';
import { AppError, ErrorCodes } from '../../lib/errors.js';
import { escapeRegex } from '../../lib/escape-regex.js';
import type { UserDocument } from '../documents.js';
import type {
  CreateUserInput,
  ListUsersFilter,
  UpdateStatusInput,
  UserRecord,
  UserRepository,
} from './user-repository.js';

function toRecord(doc: UserDocument): UserRecord {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    fullName: doc.fullName,
    passwordHash: doc.passwordHash,
    role: doc.role,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    approvedAt: doc.approvedAt,
    approvedBy: doc.approvedBy?.toHexString(),
    lastLoginAt: doc.lastLoginAt,
  };
}

export class MongoUserRepository implements UserRepository {
  private readonly users: Collection<UserDocument>;

  constructor(db: Db) {
    this.users = db.collection<UserDocument>('users');
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const _id = new ObjectId();
    const doc: UserDocument = {
      _id,
      email: input.email,
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      role: input.role,
      status: input.status,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
    try {
      await this.users.insertOne(doc);
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) {
        throw new AppError(409, ErrorCodes.EMAIL_TAKEN, 'Email is already registered');
      }
      throw err;
    }
    return toRecord(doc);
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await this.users.findOne({ email });
    return doc ? toRecord(doc) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const doc = await this.users.findOne({ _id: new ObjectId(id) });
    return doc ? toRecord(doc) : null;
  }

  async list(
    filter: ListUsersFilter,
  ): Promise<{ items: UserRecord[]; total: number }> {
    const query: Filter<UserDocument> = {};
    if (filter.status) {
      query.status = filter.status;
    }
    if (filter.q && filter.q.length > 0) {
      const pattern = escapeRegex(filter.q);
      query.$or = [
        { fullName: { $regex: pattern, $options: 'i' } },
        { email: { $regex: pattern, $options: 'i' } },
      ];
    }

    const skip = (filter.page - 1) * filter.limit;
    const [items, total] = await Promise.all([
      this.users
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(filter.limit)
        .toArray(),
      this.users.countDocuments(query),
    ]);

    return { items: items.map(toRecord), total };
  }

  async countByStatus(): Promise<{
    pending: number;
    active: number;
    disabled: number;
  }> {
    const rows = await this.users
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
      .toArray();

    const counts = { pending: 0, active: 0, disabled: 0 };
    for (const row of rows) {
      if (row._id === 'pending' || row._id === 'active' || row._id === 'disabled') {
        counts[row._id] = row.count;
      }
    }
    return counts;
  }

  async updateStatus(
    id: string,
    input: UpdateStatusInput,
  ): Promise<UserRecord | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const $set: Partial<UserDocument> = {
      status: input.status,
      updatedAt: input.updatedAt,
    };
    const $unset: Record<string, ''> = {};

    if (input.approvedAt === null) {
      $unset.approvedAt = '';
    } else if (input.approvedAt instanceof Date) {
      $set.approvedAt = input.approvedAt;
    }

    if (input.approvedBy === null) {
      $unset.approvedBy = '';
    } else if (typeof input.approvedBy === 'string') {
      $set.approvedBy = new ObjectId(input.approvedBy);
    }

    const update: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) {
      update.$unset = $unset;
    }

    const doc = await this.users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: 'after' },
    );
    return doc ? toRecord(doc) : null;
  }

  async touchLastLogin(id: string, at: Date): Promise<void> {
    if (!ObjectId.isValid(id)) {
      return;
    }
    await this.users.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastLoginAt: at, updatedAt: at } },
    );
  }
}
