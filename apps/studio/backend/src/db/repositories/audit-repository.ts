export type AuditLogRecord = {
  id: string;
  actorId: string;
  action: string;
  targetUserId?: string;
  targetAssetId?: string;
  meta?: Record<string, unknown>;
  at: Date;
};

export type CreateAuditLogInput = {
  actorId: string;
  action: string;
  targetUserId?: string;
  targetAssetId?: string;
  meta?: Record<string, unknown>;
  at: Date;
};

export interface AuditRepository {
  create(input: CreateAuditLogInput): Promise<AuditLogRecord>;
}
