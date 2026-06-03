import mongoose from "mongoose";
import type { ChatRole } from "@/lib/chat";

export interface ChatParticipantDocument extends mongoose.Document {
  conversationId: mongoose.Types.ObjectId;
  userId: string;
  role: ChatRole;
  name?: string;
  joinedAt: Date;
  lastReadAt?: Date;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatParticipantSchema = new mongoose.Schema<ChatParticipantDocument>(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    name: { type: String },
    joinedAt: { type: Date, required: true, default: Date.now },
    lastReadAt: { type: Date },
    isArchived: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "chat_participants",
  },
);

ChatParticipantSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

const ChatParticipantModel =
  (mongoose.models.ChatParticipant as mongoose.Model<ChatParticipantDocument> | undefined) ||
  mongoose.model<ChatParticipantDocument>("ChatParticipant", ChatParticipantSchema);

export default ChatParticipantModel;
