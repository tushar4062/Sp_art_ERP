import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import {
  buildStaffAttendancePreview,
  parseStaffPreviewId,
  resolveStaffPreviewFromRecordId,
  type StaffRole,
} from "@/lib/attendance/staffSelfAttendance";

export const runtime = "nodejs";

function parseRole(value: string): StaffRole | null {
  if (value === "teacher" || value === "senior-teacher") return value;
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const month = (searchParams.get("month") || new Date().toISOString().slice(0, 7)).trim();
    let role = parseRole((searchParams.get("role") || "").trim());

    await dbConnect();

    let userId: string;
    let batchId: string;

    const parsed = parseStaffPreviewId(id);
    if (parsed) {
      userId = parsed.userId;
      batchId = parsed.batchId;
    } else {
      const resolved = await resolveStaffPreviewFromRecordId(id);
      if (!resolved) {
        return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
      }
      userId = resolved.userId;
      batchId = resolved.batchId;
      if (!role) role = resolved.role;
    }

    if (!role) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    const data = await buildStaffAttendancePreview({ role, userId, batchId, month });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INVALID_MONTH") {
      return NextResponse.json({ success: false, error: "Invalid month" }, { status: 400 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }
    console.error("[admin/staff-attendance/preview GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load preview" }, { status: 500 });
  }
}
