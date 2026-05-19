import { NextResponse } from "next/server";
import { SENIOR_TEACHER_SESSION_COOKIE, clearSessionCookieOptions } from "@/lib/auth/portal-session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SENIOR_TEACHER_SESSION_COOKIE, "", clearSessionCookieOptions());
  return res;
}
