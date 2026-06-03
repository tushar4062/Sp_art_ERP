import { NextRequest, NextResponse } from "next/server";
import { getChatSessionFromRequest, searchChatUsers } from "@/lib/chat";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await getChatSessionFromRequest(request);
  if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchChatUsers(auth.user, query);
  return NextResponse.json({ success: true, data: users });
}
