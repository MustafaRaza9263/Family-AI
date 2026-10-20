import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, default: '' },
    attachments: { type: [Schema.Types.Mixed], default: [] },
    // Assistant-only fields below
    model: { type: String },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    ttftMs: { type: Number },
    latencyMs: { type: Number },
    finishReason: {
      type: String,
      enum: ['stop', 'length', 'aborted', 'error'],
    },
    guardFlags: { type: [String], default: undefined },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDocument = InferSchemaType<typeof messageSchema> & {
  _id: Types.ObjectId;
};

export const Message = model('Message', messageSchema);
