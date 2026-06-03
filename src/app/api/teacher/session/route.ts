import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Teacher from "@/lib/models/Teacher";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";

export const runtime = "nodejs";

/** Verify teacher_session cookie and return basic teacher info */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    const teacher = await Teacher.findById(auth.teacher.id).select("fullName email");
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: "Teacher record not found. Please log in again." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: teacher._id.toString(),
        fullName: teacher.fullName,
        email: teacher.email,
      },
    });
  } catch (e) {
    console.error("[teacher/session GET]", e);
    return NextResponse.json({ success: false, error: "Session check failed" }, { status: 500 });
  }
}
