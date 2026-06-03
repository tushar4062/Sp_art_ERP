import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import ChatConversation, { ChatConversationDocument } from "@/lib/models/ChatConversation";
import ChatParticipant, { ChatParticipantDocument } from "@/lib/models/ChatParticipant";
import ChatMessage, { ChatMessageDocument } from "@/lib/models/ChatMessage";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canUsersChat, getChatSessionFromRequest, resolveChatUserById } from "@/lib/chat";

export const runtime = "nodejs";

type LeanChatParticipant = {
  conversationId: mongoose.Types.ObjectId;
  userId: string;
  role: string;
  name?: string;
  lastReadAt?: Date | null;
  joinedAt?: Date;
  isArchived?: boolean;
  isMuted?: boolean;
};

export async function GET(request: NextRequest) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  await dbConnect();
  const searchQuery = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";

  const participantDocs = await ChatParticipant.find({ userId: auth.user.id, isArchived: false }).lean();
  if (participantDocs.length === 0) {
    return apiSuccess([]);
  }

  const conversationIds = participantDocs.map(participant => participant.conversationId);
  const conversations = await ChatConversation.find({ _id: { $in: conversationIds } })
    .sort({ lastMessageAt: -1 })
    .lean();

  const participantDocsForConversations = await ChatParticipant.find({ conversationId: { $in: conversationIds } }).lean<LeanChatParticipant[]>();
  const participantMap: Record<string, LeanChatParticipant[]> = participantDocsForConversations.reduce((map, participant) => {
    const key = participant.conversationId.toString();
    if (!map[key]) map[key] = [];
    map[key].push(participant);
    return map;
  }, {} as Record<string, LeanChatParticipant[]>);

  const lastMessages = await ChatMessage.aggregate([
    { $match: { conversationId: { $in: conversationIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$conversationId", message: { $first: "$$ROOT" } } },
  ]);

  const lastMessageMap = lastMessages.reduce<Record<string, ChatMessageDocument>>((map, item) => {
    map[item._id.toString()] = item.message as ChatMessageDocument;
    return map;
  }, {} as Record<string, ChatMessageDocument>);

  const threadItems = (
    await Promise.all(
      conversations.map(async conversation => {
        const participants = participantMap[conversation._id.toString()] ?? [];
        const otherParticipants = participants.filter((p: LeanChatParticipant) => p.userId !== auth.user.id);
        const other = otherParticipants[0];

        if (other) {
          const resolved = await resolveChatUserById(other.userId);
          if (resolved) {
            participants[participants.indexOf(other)] = { ...other, name: resolved.name };
          }
        }

        const title = conversation.name || other?.name || "Chat";
        const subtitle = other?.role ? other.role : "Group chat";
        const lastMessage = lastMessageMap[conversation._id.toString()] ?? null;
        const renderedLastMessage = lastMessage ? lastMessage.content : "No messages yet";
        const item = {
          id: conversation._id.toString(),
          title,
          subtitle,
          lastMessage: renderedLastMessage,
          lastMessageAt: conversation.lastMessageAt?.toISOString() ?? conversation.updatedAt?.toISOString() ?? new Date().toISOString(),
          unreadCount: 0,
          participant: other
            ? {
                id: other.userId,
                role: other.role,
                name: other.name,
              }
            : null,
          lastReadAt: participants.find((p: LeanChatParticipant) => p.userId === auth.user.id)?.lastReadAt ?? null,
        };

        if (searchQuery) {
          const normalized = `${item.title} ${item.subtitle} ${item.lastMessage}`.toLowerCase();
          if (!normalized.includes(searchQuery)) return null;
        }

        const unreadCount = await ChatMessage.countDocuments({
          conversationId: conversation._id,
          createdAt: { $gt: item.lastReadAt ?? new Date(0) },
          senderId: { $ne: auth.user.id },
        });

        return { ...item, unreadCount };
      }),
    )
  ).filter(Boolean);

  return apiSuccess(threadItems);
}

export async function POST(request: NextRequest) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  const body = await request.json();
  const recipientId = typeof body?.recipientId === "string" ? body.recipientId.trim() : "";
  if (!recipientId) {
    return apiError("Recipient is required.", 400);
  }

  const recipient = await resolveChatUserById(recipientId);
  if (!recipient) {
    return apiError("Recipient not found.", 404);
  }

  if (!(await canUsersChat(auth.user, recipient))) {
    return apiError("You are not allowed to start a conversation with this user.", 403);
  }

  await dbConnect();

  const participantIds = [auth.user.id, recipient.id].sort();
  const participantHash = participantIds.join("|");

  const existingConversation = await ChatConversation.findOne({
    participantHash,
    isGroup: false,
  });

  if (existingConversation) {
    return apiSuccess({ conversationId: existingConversation._id.toString() });
  }

  const conversation = await ChatConversation.create({
    name: null,
    isGroup: false,
    createdBy: auth.user.id,
    participantIds,
    participantHash,
    lastMessageAt: new Date(),
  });

  await ChatParticipant.create([
    {
      conversationId: conversation._id,
      userId: auth.user.id,
      role: auth.user.role,
      name: auth.user.name,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      isArchived: false,
      isMuted: false,
    },
    {
      conversationId: conversation._id,
      userId: recipient.id,
      role: recipient.role,
      name: recipient.name,
      joinedAt: new Date(),
      isArchived: false,
      isMuted: false,
    },
  ]);

  return apiSuccess({ conversationId: conversation._id.toString() }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  const conversationId = new URL(request.url).searchParams.get("id")?.trim() || "";
  if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
    return apiError("Invalid conversation ID.", 400);
  }

  await dbConnect();
  const participant = await ChatParticipant.findOne({
    conversationId: new mongoose.Types.ObjectId(conversationId),
    userId: auth.user.id,
  });

  if (!participant) {
    return apiError("Conversation not found.", 404);
  }

  if (!participant.isArchived) {
    participant.isArchived = true;
    await participant.save();
  }

  return apiSuccess({});
}
