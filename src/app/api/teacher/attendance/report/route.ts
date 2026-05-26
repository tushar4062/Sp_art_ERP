import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TeacherAttendanceModel from "@/lib/models/TeacherAttendance";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { currentMonthString, monthDateBounds } from "@/lib/dates/attendanceDate";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(req);
    if (!auth.ok) return auth.response;

    await dbConnect();

    const teacherId = auth.teacher.id;

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const useMonth = month || currentMonthString();
    const bounds = monthDateBounds(useMonth);
    if (!bounds) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);

    const records = await TeacherAttendanceModel.find({
      teacherId: objectTeacherId,
      attendanceDate: { $gte: bounds.start, $lte: bounds.end },
    })
      .select("attendanceDate status batchId remarks")
      .lean();

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const total = records.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return NextResponse.json({ success: true, records, summary: { present, absent, total, percentage }, month: useMonth }, { status: 200 });
  } catch (error) {
    console.error("Error fetching teacher attendance report:", error);
    return NextResponse.json({ error: "Failed to fetch attendance report" }, { status: 500 });
  }
}
