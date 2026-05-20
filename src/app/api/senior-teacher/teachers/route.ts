import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Teacher, { type TeacherDocument } from "@/lib/models/Teacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { toTeacherJson } from "@/lib/serializers/teacherSerialize";

export const runtime = "nodejs";

const PAGE_SIZE = 10;

function applyExperienceFilter(filter: Record<string, unknown>, experience: string) {
  if (!experience || experience === "All") return;
  if (experience === "0-2") filter.experience = { $gte: 0, $lte: 2 };
  else if (experience === "3-5") filter.experience = { $gte: 3, $lte: 5 };
  else if (experience === "6+") filter.experience = { $gte: 6 };
  else {
    const years = parseInt(experience, 10);
    if (!Number.isNaN(years)) filter.experience = years;
  }
}

function buildFilter(params: {
  search?: string;
  status?: string;
  subject?: string;
  specialization?: string;
  gender?: string;
  experience?: string;
}) {
  const filter: Record<string, unknown> = {
    isSenior: { $ne: true },
  };

  if (params.status && params.status !== "All") filter.status = params.status;
  if (params.subject && params.subject !== "All") filter.currentSubjectCourse = params.subject;
  if (params.specialization && params.specialization !== "All") filter.specialization = params.specialization;
  if (params.gender && params.gender !== "All") filter.gender = params.gender;
  applyExperienceFilter(filter, params.experience ?? "All");

  const search = params.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    filter.$or = [
      { fullName: regex },
      { email: regex },
      { specialization: regex },
      { currentSubjectCourse: regex },
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
    const subject = searchParams.get("subject") || "All";
    const specialization = searchParams.get("specialization") || "All";
    const gender = searchParams.get("gender") || "All";
    const experience = searchParams.get("experience") || "All";

    const filter = buildFilter({ search, status, subject, specialization, gender, experience });

    const [total, teachers, subjectOptions, specializationOptions] = await Promise.all([
      Teacher.countDocuments(filter),
      Teacher.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      Teacher.distinct("currentSubjectCourse", filter),
      Teacher.distinct("specialization", filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return NextResponse.json({
      success: true,
      data: {
        teachers: teachers.map(doc => toTeacherJson(doc as TeacherDocument)),
        pagination: { page, limit: PAGE_SIZE, total, totalPages },
        filterOptions: {
          subjects: (subjectOptions as string[]).filter(Boolean).sort(),
          specializations: (specializationOptions as string[]).filter(Boolean).sort(),
        },
      },
    });
  } catch (error) {
    console.error("[senior-teacher/teachers GET]", error);
    return apiError(error, "Failed to load teachers");
  }
}
