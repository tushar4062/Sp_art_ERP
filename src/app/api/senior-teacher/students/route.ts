import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Student, { type StudentDocument } from "@/lib/models/Student";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { toStudentJson } from "@/lib/serializers/studentSerialize";

export const runtime = "nodejs";

const PAGE_SIZE = 10;

function buildFilter(params: {
  search?: string;
  status?: string;
  className?: string;
  course?: string;
  gender?: string;
}) {
  const filter: Record<string, unknown> = {};

  if (params.status && params.status !== "All") {
    if (params.status === "Active") filter.feeStatus = "Paid";
    else filter.feeStatus = { $in: ["Pending", "Overdue"] };
  }
  if (params.className && params.className !== "All") filter.className = params.className;
  if (params.course && params.course !== "All") filter.currentCourse = params.course;
  if (params.gender && params.gender !== "All") filter.gender = params.gender;

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { className: regex },
      { currentCourse: regex },
    ];
  }

  return filter;
}

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

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "All";
    const className = searchParams.get("class") || "All";
    const course = searchParams.get("course") || "All";
    const gender = searchParams.get("gender") || "All";

    const filter = buildFilter({ search, status, className, course, gender });

    const [total, students, classOptions, courseOptions] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Student.distinct("className", filter),
      Student.distinct("currentCourse", filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return NextResponse.json({
      success: true,
      data: {
        students: students.map(doc => toStudentJson(doc as StudentDocument)),
        pagination: { page, limit: PAGE_SIZE, total, totalPages },
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
