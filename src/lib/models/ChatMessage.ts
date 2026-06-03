import mongoose from "mongoose";
import type { ChatRole } from "@/lib/chat";

export interface ChatMessageReadReceipt {
  userId: string;
  readAt: Date;
}

export interface ChatMessageDocument extends mongoose.Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: string;
  senderRole: ChatRole;
  senderName: string;
  content: string;
  messageType: "text" | "file";
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  readBy: ChatMessageReadReceipt[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageReadReceiptSchema = new mongoose.Schema<ChatMessageReadReceipt>(
  {
    userId: { type: String, required: true },
    readAt: { type: Date, required: true },
  },
  { _id: false },
);

const ChatMessageSchema = new mongoose.Schema<ChatMessageDocument>(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true, default: "" },
    messageType: { type: String, enum: ["text", "file"], required: true, default: "text" },
    fileUrl: { type: String },
    fileName: { type: String },
    fileMimeType: { type: String },
    fileSize: { type: Number },
    readBy: { type: [ChatMessageReadReceiptSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "chat_messages",
  },
);

const ChatMessageModel =
  (mongoose.models.ChatMessage as mongoose.Model<ChatMessageDocument> | undefined) ||
  mongoose.model<ChatMessageDocument>("ChatMessage", ChatMessageSchema);

export default ChatMessageModel;
