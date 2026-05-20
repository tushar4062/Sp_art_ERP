import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Student, { type StudentDocument } from "@/lib/models/Student";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";

export const runtime = "nodejs";

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function studentStatus(doc: StudentDocument): "Active" | "Inactive" {
  return doc.feeStatus === "Paid" ? "Active" : "Inactive";
}

function toStudentJson(doc: StudentDocument) {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email ?? "",
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    age: doc.age ?? null,
    course: doc.currentCourse ?? "",
    className: doc.className,
    parentName: doc.parentName ?? doc.fatherName ?? "",
    parentContact: doc.fatherMobile ?? doc.motherMobile ?? doc.phone ?? "",
    address: doc.address ?? "",
    profileImage: doc.photo ?? "",
    status: studentStatus(doc),
    feeStatus: doc.feeStatus,
    attendancePercentage: 0,
    joiningDate: formatDate(doc.createdAt),
    artTeacher: doc.artTeacher ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

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
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid student id" }, { status: 400 });
    }

    await dbConnect();
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json({ success: false, error: "Senior teacher not found" }, { status: 404 });
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found in students collection" }, { status: 404 });
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
    if (!auth.ok) return auth.response;

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
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json({ success: false, error: "Senior teacher not found" }, { status: 404 });
    }

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
    }

    const data = parsed.data;
    if (data.fullName !== undefined) student.fullName = data.fullName;
    if (data.phone !== undefined) student.phone = data.phone;
    if (data.gender !== undefined) student.gender = data.gender;
    if (data.age !== undefined) student.age = data.age;
    if (data.course !== undefined) student.currentCourse = data.course;
    if (data.className !== undefined) student.className = data.className;
    if (data.parentName !== undefined) student.parentName = data.parentName;
    if (data.parentContact !== undefined) student.fatherMobile = data.parentContact;
    if (data.address !== undefined) student.address = data.address;
    if (data.profileImage !== undefined) student.photo = data.profileImage || undefined;
    if (data.status !== undefined) {
      student.feeStatus = data.status === "Active" ? "Paid" : "Pending";
    }

    await student.save();

    return NextResponse.json({
      success: true,
      data: { student: toStudentJson(student) },
      message: "Student updated in students collection",
    });
  } catch (error) {
    console.error("[senior-teacher/students/[id] PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update student" }, { status: 500 });
  }
}
