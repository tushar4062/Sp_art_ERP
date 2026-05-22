import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import TeacherAttendanceModel from "@/lib/models/TeacherAttendance";
import { TEACHER_SESSION_COOKIE } from "@/lib/auth/portal-session";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const teacherId = req.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    if (!teacherId || !mongoose.Types.ObjectId.isValid(teacherId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");

    const now = new Date();
    const useMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [year, monthNumber] = useMonth.split("-").map(Number);
    if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const startStr = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
    const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
    const nextYear = monthNumber === 12 ? year + 1 : year;
    const endStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

    const objectTeacherId = new mongoose.Types.ObjectId(teacherId);

    const records = await TeacherAttendanceModel.find({
      teacherId: objectTeacherId,
      attendanceDate: { $gte: startStr, $lt: endStr },
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
