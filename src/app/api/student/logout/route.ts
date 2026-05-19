import { NextResponse } from "next/server";
import { STUDENT_COOKIE } from "@/lib/auth/student-jwt";
import { apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";

export async function POST() {
  const response = apiSuccess({ ok: true });
  response.cookies.set(STUDENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
