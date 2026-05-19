import { NextRequest } from "next/server";
import { STUDENT_COOKIE, verifyStudentToken } from "@/lib/auth/student-jwt";
import { apiError } from "@/lib/api-response";

export async function requireStudentFromRequest(request: NextRequest) {
  const token = request.cookies.get(STUDENT_COOKIE)?.value;
  if (!token) {
    return { ok: false as const, response: apiError("Unauthorized", 401) };
  }

  const student = await verifyStudentToken(token);
  if (!student) {
    return { ok: false as const, response: apiError("Invalid or expired session", 401) };
  }

  return { ok: true as const, student };
}
