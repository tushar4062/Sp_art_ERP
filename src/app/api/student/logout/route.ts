import { NextResponse } from "next/server";
import { STUDENT_SESSION_COOKIE, clearSessionCookieOptions } from "@/lib/auth/portal-session";
import { apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  const response = apiSuccess({ ok: true });
  response.cookies.set(STUDENT_SESSION_COOKIE, "", clearSessionCookieOptions());
  return response;
}
