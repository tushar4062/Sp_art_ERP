import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Student, { type StudentDocument } from "@/lib/models/Student";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import {
  STUDENT_PAGE_SIZE,
  buildSeniorTeacherStudentsFilter,
} from "@/lib/auth/senior-teacher-student-scope";
import { toStudentJson } from "@/lib/serializers/studentSerialize";
import Credentials, { type CredentialDocument } from '@/lib/models/Credentials';

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

    // Map DB rows to JSON serializable objects
    const studentJsons = rows.map(doc => toStudentJson(doc as StudentDocument));

    // Fetch credential accountStatus for these students by email (case-insensitive via lowercasing)
    const emails = studentJsons.map(s => (s.email || '').toLowerCase()).filter(Boolean);
    if (emails.length) {
      const creds = await Credentials.find({ email: { $in: emails }, role: 'student' }).lean();
      const credMap = new Map<string, string>(creds.map((c: CredentialDocument) => [(c.email || '').toLowerCase(), c.accountStatus]));
      studentJsons.forEach(s => {
        const acct = credMap.get((s.email || '').toLowerCase());
        if (acct) s.status = acct as 'Active' | 'Inactive';
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        students: studentJsons,
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
