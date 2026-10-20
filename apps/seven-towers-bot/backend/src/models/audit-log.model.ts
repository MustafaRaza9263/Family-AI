import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetConversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' },
    ip: { type: String, default: null },
    meta: { type: Schema.Types.Mixed },
    at: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ actorId: 1, at: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & {
  _id: Types.ObjectId;
};

export const AuditLog = model('AuditLog', auditLogSchema);
