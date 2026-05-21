import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyAdminSessionToken, getAdminSessionTokenFromRequest } from "@/lib/auth/admin-session";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import Batch from "@/lib/models/Batch";

export type BatchAccess =
  | { kind: "admin" }
  | { kind: "senior"; seniorTeacherId: string }
  | { kind: "teacher"; teacherId: string };

export async function getBatchAccess(request: NextRequest): Promise<BatchAccess | null> {
  const adminToken = getAdminSessionTokenFromRequest(request);
  if (verifyAdminSessionToken(adminToken)) {
    return { kind: "admin" };
  }
  const st = await requireSeniorTeacherFromRequest(request);
  if (st.ok) {
    return { kind: "senior", seniorTeacherId: st.seniorTeacher.id };
  }
  const teacher = await requireTeacherFromRequest(request);
  if (teacher.ok) {
    return { kind: "teacher", teacherId: teacher.teacher.id };
  }
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

/** Create / update / delete — admin or senior teacher only (not teachers). */
export async function requireBatchWrite(request: NextRequest) {
  const access = await getBatchAccess(request);
  if (!access || access.kind === "teacher") {
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
  return { ok: true as const, access };
}

/** Teacher may only read batches they are assigned to. */
export async function teacherCanAccessBatch(teacherId: string, batchId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(batchId)) return false;
  const count = await Batch.countDocuments({
    _id: new mongoose.Types.ObjectId(batchId),
    teacherIds: new mongoose.Types.ObjectId(teacherId),
  });
  return count > 0;
}
