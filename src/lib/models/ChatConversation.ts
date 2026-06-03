import mongoose from "mongoose";

export interface ChatConversationDocument extends mongoose.Document {
  name?: string;
  isGroup: boolean;
  createdBy: string;
  participantIds: string[];
  participantHash?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatConversationSchema = new mongoose.Schema<ChatConversationDocument>(
  {
    name: { type: String },
    isGroup: { type: Boolean, default: false },
    createdBy: { type: String, required: true, index: true },
    participantIds: { type: [String], required: true, index: true },
    participantHash: { type: String, index: true, sparse: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
    collection: "chat_conversations",
  },
);

ChatConversationSchema.index(
  { participantHash: 1, isGroup: 1 },
  { unique: true, partialFilterExpression: { participantHash: { $exists: true }, isGroup: false } },
);

const ChatConversationModel =
  (mongoose.models.ChatConversation as mongoose.Model<ChatConversationDocument> | undefined) ||
  mongoose.model<ChatConversationDocument>("ChatConversation", ChatConversationSchema);

export default ChatConversationModel;
