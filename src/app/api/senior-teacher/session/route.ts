import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id).select("fullName email");
    if (!senior) {
      return NextResponse.json(
        { success: false, error: "Senior teacher record not found. Please log in again." },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: senior._id.toString(),
        fullName: senior.fullName,
        email: senior.email,
      },
    });
  } catch (e) {
    console.error("[senior-teacher/session GET]", e);
    return NextResponse.json({ success: false, error: "Session check failed" }, { status: 500 });
  }
}
