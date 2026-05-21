import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionToken, getAdminSessionTokenFromRequest } from "@/lib/auth/admin-session";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";

export type BatchAccess =
  | { kind: "admin" }
  | { kind: "senior"; seniorTeacherId: string };

export async function getBatchAccess(request: NextRequest): Promise<BatchAccess | null> {
  const adminToken = getAdminSessionTokenFromRequest(request);
  if (verifyAdminSessionToken(adminToken)) {
    console.log("[batch-access] granted: admin session");
    return { kind: "admin" };
  }
  const st = await requireSeniorTeacherFromRequest(request);
  if (st.ok) {
    console.log("[batch-access] granted: senior teacher", st.seniorTeacher.id);
    return { kind: "senior", seniorTeacherId: st.seniorTeacher.id };
  }
  console.log("[batch-access] denied: no admin token or senior_teacher_session cookie");
  return null;
}

export async function requireBatchRead(request: NextRequest) {
  const access = await getBatchAccess(request);
  if (!access) {
    return {
      ok: false as const,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true as const, access };
}

/** Create / update / delete — admin session or senior teacher session. */
export async function requireBatchWrite(request: NextRequest) {
  const access = await getBatchAccess(request);
  if (!access) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: "Forbidden — only an authenticated admin or senior teacher can modify batches",
        },
        { status: 403 },
      ),
    };
  }
  console.log("[batch-access] write granted:", access.kind);
  return { ok: true as const, access };
}
