import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import {
  buildAttendanceReports,
  defaultReportFromDate,
  reportTodayIso,
  ReportError,
} from "@/lib/attendance/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const data = await buildAttendanceReports(
      { kind: "senior", seniorTeacherId: auth.seniorTeacher.id },
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
    console.error("[senior-teacher/attendance/reports GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance reports" }, { status: 500 });
  }
}
