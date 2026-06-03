import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Teacher, { type TeacherDocument } from "@/lib/models/Teacher";
import SeniorTeacher, { type SeniorTeacherDocument } from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { getBatchAccess } from "@/lib/auth/require-batch-access";
import {
  PAGE_SIZE,
  buildSeniorTeacherTeachersFilter,
} from "@/lib/auth/senior-teacher-teacher-scope";
import { toTeacherJson } from "@/lib/serializers/teacherSerialize";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    /** Lightweight list for batch teacher picker (admin or senior teacher). */
    if (searchParams.get("brief") === "1") {
      const batchAccess = await getBatchAccess(request);
      if (!batchAccess) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      await dbConnect();

      // Fetch both regular teachers and senior teachers
      const [teachers, seniorTeachers] = await Promise.all([
        Teacher.find({ status: "Active" })
          .select("fullName email isSenior")
          .sort({ fullName: 1 })
          .limit(250)
          .lean(),
        SeniorTeacher.find({ status: "Active" })
          .select("fullName email")
          .sort({ fullName: 1 })
          .limit(250)
          .lean(),
      ]);

      // Combine and map both collections
      const allTeachers = [
        ...teachers.map(t => ({
          id: t._id.toString(),
          fullName: t.fullName,
          email: t.email,
          isSenior: t.isSenior || false,
        })),
        ...seniorTeachers.map(st => ({
          id: st._id.toString(),
          fullName: st.fullName,
          email: st.email,
          isSenior: true,
        })),
      ].sort((a, b) => a.fullName.localeCompare(b.fullName));

      return NextResponse.json({
        success: true,
        data: {
          teachers: allTeachers,
        },
      });
    }

    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const seniorId = auth.seniorTeacher.id;
    await dbConnect();

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const filter = buildSeniorTeacherTeachersFilter(seniorId, {
      search: searchParams.get("search") || "",
      status: searchParams.get("status") || "All",
      subject: searchParams.get("subject") || "All",
      specialization: searchParams.get("specialization") || "All",
      gender: searchParams.get("gender") || "All",
      experience: searchParams.get("experience") || "All",
    });

    const [total, rows, subjectOptions, specializationOptions] = await Promise.all([
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
        teachers: rows.map(doc => toTeacherJson(doc as TeacherDocument)),
        pagination: { page, limit: PAGE_SIZE, total, totalPages },
        filterOptions: {
          subjects: (subjectOptions as string[]).filter(Boolean).sort(),
          specializations: (specializationOptions as string[]).filter(Boolean).sort(),
        },
      },
    });
  } catch (error) {
    console.error("[senior-teacher/teachers GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load teachers" }, { status: 500 });
  }
}
