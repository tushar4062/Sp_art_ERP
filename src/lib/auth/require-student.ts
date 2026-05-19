import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { STUDENT_SESSION_COOKIE } from "@/lib/auth/portal-session";
import { apiError } from "@/lib/api-response";

export async function requireStudentFromRequest(request: NextRequest) {
  const id = request.cookies.get(STUDENT_SESSION_COOKIE)?.value;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false as const, response: apiError("Unauthorized", 401) };
  }

  return {
    ok: true as const,
    student: { id, email: "" },
  };
}
