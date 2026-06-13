import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Student from "@/lib/models/Student";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { singleStudentScope } from "@/lib/auth/senior-teacher-student-scope";
import { toStudentJson } from "@/lib/serializers/studentSerialize";

export const runtime = "nodejs";

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(30).optional(),
  gender: z.string().trim().optional(),
  age: z.coerce.number().min(0).max(120).optional(),
  course: z.string().trim().optional(),
  className: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentContact: z.string().trim().optional(),
  address: z.string().trim().optional(),
  profileImage: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid student id" }, { status: 400 });
    }

    await dbConnect();
    const student = await Student.findOne(singleStudentScope(id, auth.seniorTeacher.id));
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { student: toStudentJson(student) } });
  } catch (error) {
    console.error("[senior-teacher/students/[id] GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load student" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid student id" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    const student = await Student.findOne(singleStudentScope(id, auth.seniorTeacher.id));
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const data = parsed.data;
    if (data.fullName !== undefined) student.fullName = data.fullName;
    if (data.phone !== undefined) student.phone = data.phone;
    if (data.gender !== undefined) student.gender = data.gender;
    if (data.age !== undefined) student.age = data.age;
    // 'course' is managed via enrollments; do not set deprecated `currentCourse` on student
    if (data.className !== undefined) student.className = data.className;
    if (data.parentName !== undefined) student.parentName = data.parentName;
    if (data.parentContact !== undefined) student.fatherMobile = data.parentContact;
    if (data.address !== undefined) student.address = data.address;
    if (data.profileImage !== undefined) student.photo = data.profileImage || undefined;
    if (data.status !== undefined) {
      student.feeStatus = data.status === "Active" ? "Paid" : "Pending";
    }
    if (!student.createdBy) {
      student.createdBy = new mongoose.Types.ObjectId(auth.seniorTeacher.id);
    }

    await student.save();

    return NextResponse.json({
      success: true,
      data: { student: toStudentJson(student) },
      message: "Student updated",
    });
  } catch (error) {
    console.error("[senior-teacher/students/[id] PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update student" }, { status: 500 });
  }
}
