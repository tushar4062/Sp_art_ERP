import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { buildStaffAttendanceGroupedList, type StaffRole } from "@/lib/attendance/staffSelfAttendance";

export const runtime = "nodejs";

function parseRole(value: string): StaffRole | null {
  if (value === "teacher" || value === "senior-teacher") return value;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const role = parseRole((searchParams.get("role") || "teacher").trim());
    if (!role) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    await dbConnect();

    const data = await buildStaffAttendanceGroupedList({
      role,
      batchId: (searchParams.get("batchId") || "").trim() || undefined,
      userId: (searchParams.get("userId") || searchParams.get("teacherId") || "").trim() || undefined,
      search: (searchParams.get("search") || "").trim() || undefined,
      page: Number(searchParams.get("page") || "1"),
      limit: Number(searchParams.get("limit") || "20"),
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[admin/staff-attendance/reports GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load report" }, { status: 500 });
  }
}
