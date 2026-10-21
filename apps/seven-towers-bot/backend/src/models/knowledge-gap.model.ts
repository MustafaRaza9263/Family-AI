import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const knowledgeGapSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    need: { type: String, required: true },
    count: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ['open', 'resolved', 'ignored'],
      required: true,
      default: 'open',
    },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    lastQuestion: { type: String, required: true },
    lastAskerName: { type: String, required: true },
    lastAskerEmail: { type: String, required: true },
    lastConversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reopenCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, collection: 'knowledge_gaps' },
);

knowledgeGapSchema.index({ status: 1, count: -1, lastSeenAt: -1 });

export type KnowledgeGapDocument = InferSchemaType<typeof knowledgeGapSchema> & {
  _id: Types.ObjectId;
};

export const KnowledgeGap = model('KnowledgeGap', knowledgeGapSchema);
