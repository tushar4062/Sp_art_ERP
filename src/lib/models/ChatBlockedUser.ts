import mongoose from "mongoose";

export interface ChatBlockedUserDocument extends mongoose.Document {
  userId: string;
  blockedUserId: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatBlockedUserSchema = new mongoose.Schema<ChatBlockedUserDocument>(
  {
    userId: { type: String, required: true, index: true },
    blockedUserId: { type: String, required: true, index: true },
    reason: { type: String },
  },
  {
    timestamps: true,
    collection: "chat_blocked_users",
  },
);

ChatBlockedUserSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });

const ChatBlockedUserModel =
  (mongoose.models.ChatBlockedUser as mongoose.Model<ChatBlockedUserDocument> | undefined) ||
  mongoose.model<ChatBlockedUserDocument>("ChatBlockedUser", ChatBlockedUserSchema);

export default ChatBlockedUserModel;
