import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Student, { type StudentDocument } from "@/lib/models/Student";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import {
  STUDENT_PAGE_SIZE,
  buildSeniorTeacherStudentsFilter,
} from "@/lib/auth/senior-teacher-student-scope";
import { toStudentJson } from "@/lib/serializers/studentSerialize";

export const runtime = "nodejs";

function apiError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const isMongo =
    message.includes("MongoServerSelectionError") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("timed out");
  return NextResponse.json(
    {
      success: false,
      error: isMongo
        ? "Cannot reach MongoDB. Check your internet, Atlas IP whitelist, and MONGODB_URI in .env."
        : message || fallback,
    },
    { status: isMongo ? 503 : 500 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const seniorId = auth.seniorTeacher.id;
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const filter = buildSeniorTeacherStudentsFilter(seniorId, {
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "All",
      className: searchParams.get("class") || "All",
      course: searchParams.get("course") || "All",
      gender: searchParams.get("gender") || "All",
    });

    const [total, rows, classOptions, courseOptions] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * STUDENT_PAGE_SIZE)
        .limit(STUDENT_PAGE_SIZE)
        .lean(),
      Student.distinct("className", filter),
      Student.distinct("currentCourse", filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / STUDENT_PAGE_SIZE));

    return NextResponse.json({
      success: true,
      data: {
        students: rows.map(doc => toStudentJson(doc as StudentDocument)),
        pagination: { page, limit: STUDENT_PAGE_SIZE, total, totalPages },
        filterOptions: {
          classes: (classOptions as string[]).filter(Boolean).sort(),
          courses: (courseOptions as string[]).filter(Boolean).sort(),
        },
      },
    });
  } catch (error) {
    console.error("[senior-teacher/students GET]", error);
    return apiError(error, "Failed to load students");
  }
}
