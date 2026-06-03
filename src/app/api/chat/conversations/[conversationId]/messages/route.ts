import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import ChatConversation from "@/lib/models/ChatConversation";
import ChatParticipant from "@/lib/models/ChatParticipant";
import ChatMessage, { ChatMessageDocument } from "@/lib/models/ChatMessage";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getChatSessionFromRequest } from "@/lib/chat";

export const runtime = "nodejs";

function normalizeMessage(message: ChatMessageDocument) {
  return {
    id: message._id.toString(),
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    content: message.content,
    messageType: message.messageType,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileMimeType: message.fileMimeType,
    fileSize: message.fileSize,
    readBy: message.readBy?.map((receipt: { userId: string; readAt: Date }) => ({
      userId: receipt.userId,
      readAt: receipt.readAt,
    })) || [],
    createdAt: message.createdAt,
  };
}

function sanitizeFileName(fileName: string) {
  const re = new RegExp("[\\\\/:*?\"<>|\\s]+", "g");
  return fileName.replace(re, "_").slice(0, 120);
}

async function saveAttachment(file: File, conversationId: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "chat", conversationId);
  await fs.mkdir(uploadDir, { recursive: true });
  const safeName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const messagePath = path.join(uploadDir, safeName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(messagePath, fileBuffer);
  return `/uploads/chat/${conversationId}/${safeName}`;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  const { conversationId } = await params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return apiError("Invalid conversation id.", 400);
  }

  await dbConnect();
  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) {
    return apiError("Conversation not found.", 404);
  }

  const participant = await ChatParticipant.findOne({
    conversationId: conversation._id,
    userId: auth.user.id,
  });

  if (!participant) {
    return apiError("Not authorized to view this conversation.", 403);
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
  const before = url.searchParams.get("before");
  type MessageQuery = { conversationId: mongoose.Types.ObjectId; createdAt?: { $lt: Date } };
  const query: MessageQuery = { conversationId: conversation._id };
  if (before) {
    const beforeDate = new Date(before);
    if (!Number.isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  participant.lastReadAt = new Date();
  await participant.save();

  return apiSuccess(messages.reverse().map(normalizeMessage));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  const { conversationId } = await params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return apiError("Invalid conversation id.", 400);
  }

  await dbConnect();
  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) {
    return apiError("Conversation not found.", 404);
  }

  const participant = await ChatParticipant.findOne({
    conversationId: conversation._id,
    userId: auth.user.id,
  });

  if (!participant) {
    return apiError("Not authorized to send messages in this conversation.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  let text = "";
  let file: File | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json();
    text = typeof body.text === "string" ? body.text.trim() : "";
  } else {
    const formData = await request.formData();
    const textValue = formData.get("text");
    if (typeof textValue === "string") text = textValue.trim();
    const attachment = formData.get("attachment");
    if (attachment instanceof File) {
      file = attachment;
    }
  }

  if (!text && !file) {
    return apiError("A message text or attachment is required.", 400);
  }

  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let fileMimeType: string | undefined;
  let fileSize: number | undefined;
  let messageType: "text" | "file" = "text";

  if (file) {
    if (file.size > 20 * 1024 * 1024) {
      return apiError("Attachment size cannot exceed 20MB.", 413);
    }
    fileUrl = await saveAttachment(file, conversationId);
    fileName = file.name;
    fileMimeType = file.type || undefined;
    fileSize = file.size;
    messageType = "file";
  }

  const message = await ChatMessage.create({
    conversationId: conversation._id,
    senderId: auth.user.id,
    senderRole: auth.user.role,
    senderName: auth.user.name,
    content: text || fileName || "",
    messageType,
    fileUrl,
    fileName,
    fileMimeType,
    fileSize,
    readBy: [{ userId: auth.user.id, readAt: new Date() }],
  });

  conversation.lastMessageAt = new Date();
  await conversation.save();

  return apiSuccess(normalizeMessage(message), { status: 201 });
}
