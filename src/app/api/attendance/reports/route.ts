import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireBatchRead } from "@/lib/auth/require-batch-access";
import {
  buildAttendanceReports,
  defaultReportFromDate,
  reportTodayIso,
  ReportError,
} from "@/lib/attendance/reports";

export const runtime = "nodejs";

/** Legacy shared reports — admin & senior only (teachers: use role-specific routes). */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireBatchRead(request);
    if (!auth.ok) return auth.response;
    if (auth.access.kind === "teacher") {
      return NextResponse.json(
        {
          success: false,
          error: "Use My Batches for teacher attendance, or log in as Senior Teacher / Admin for reports",
        },
        { status: 403 },
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const data = await buildAttendanceReports(auth.access, {
      batchId: (searchParams.get("batchId") || "").trim(),
      from: (searchParams.get("from") || defaultReportFromDate()).trim(),
      to: (searchParams.get("to") || reportTodayIso()).trim(),
      report: (searchParams.get("report") || "summary").trim(),
      type: (searchParams.get("type") || "teacher").trim(),
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    if (e instanceof ReportError) {
      return NextResponse.json({ success: false, error: e.message }, { status: e.status });
    }
    console.error("[attendance/reports GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load attendance reports" }, { status: 500 });
  }
}
