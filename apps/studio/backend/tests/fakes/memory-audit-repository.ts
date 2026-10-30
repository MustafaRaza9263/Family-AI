import { randomUUID } from 'node:crypto';
import type {
  AuditLogRecord,
  AuditRepository,
  CreateAuditLogInput,
} from '../../src/db/repositories/audit-repository.js';

export class MemoryAuditRepository implements AuditRepository {
  readonly logs: AuditLogRecord[] = [];

  async create(input: CreateAuditLogInput): Promise<AuditLogRecord> {
    const record: AuditLogRecord = {
      id: randomUUID(),
      actorId: input.actorId,
      action: input.action,
      targetUserId: input.targetUserId,
      targetAssetId: input.targetAssetId,
      meta: input.meta,
      at: input.at,
    };
    this.logs.push(record);
    return { ...record };
  }
}
