import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { getAdminSessionTokenFromRequest, verifyAdminSessionToken } from "@/lib/auth/admin-session";
import {
  buildAttendanceReports,
  defaultReportFromDate,
  reportTodayIso,
  ReportError,
} from "@/lib/attendance/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const token = getAdminSessionTokenFromRequest(request);
    if (!verifyAdminSessionToken(token)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const data = await buildAttendanceReports(
      { kind: "admin" },
      {
        batchId: (searchParams.get("batchId") || "").trim(),
        from: (searchParams.get("from") || defaultReportFromDate()).trim(),
        to: (searchParams.get("to") || reportTodayIso()).trim(),
        report: (searchParams.get("report") || "summary").trim(),
        type: (searchParams.get("type") || "teacher").trim(),
      },
    );

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof ReportError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    console.error("[admin/attendance/reports GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance reports" }, { status: 500 });
  }
}
