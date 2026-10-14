import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const conversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    projectId: { type: String, required: true },
    title: { type: String, required: true },
  },
  { timestamps: true },
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema> & {
  _id: Types.ObjectId;
};

export const Conversation = model('Conversation', conversationSchema);
