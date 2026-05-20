import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Teacher, { type TeacherDocument } from "@/lib/models/Teacher";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";

export const runtime = "nodejs";

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function toTeacherJson(doc: TeacherDocument) {
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    age: doc.age ?? null,
    specialization: doc.specialization,
    subject: doc.currentSubjectCourse ?? "",
    experience: doc.experience,
    qualification: doc.qualification ?? "",
    joiningDate: formatDate(doc.joiningDate ?? doc.createdAt),
    address: doc.address ?? "",
    profileImage: doc.photo ?? "",
    salary: doc.salary ?? null,
    status: doc.status,
    teacherId: doc.badgeId ?? "",
    role: doc.role ?? "",
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().max(30).optional(),
  gender: z.string().trim().optional(),
  age: z.coerce.number().min(0).optional(),
  specialization: z.string().trim().min(1).optional(),
  subject: z.string().trim().min(1).optional(),
  experience: z.coerce.number().min(0).optional(),
  qualification: z.string().trim().optional(),
  joiningDate: z.string().trim().optional(),
  address: z.string().trim().optional(),
  profileImage: z.string().optional(),
  salary: z.coerce.number().min(0).optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid teacher id" }, { status: 400 });
    }

    await dbConnect();
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json({ success: false, error: "Senior teacher not found" }, { status: 404 });
    }

    const teacher = await Teacher.findOne({ _id: id, isSenior: { $ne: true } });
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found in teachers collection" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { teacher: toTeacherJson(teacher) } });
  } catch (error) {
    console.error("[senior-teacher/teachers/[id] GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load teacher" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid teacher id" }, { status: 400 });
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

    const teacher = await Teacher.findOne({ _id: id, isSenior: { $ne: true } });
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const data = parsed.data;
    if (data.fullName !== undefined) teacher.fullName = data.fullName;
    if (data.phone !== undefined) teacher.phone = data.phone;
    if (data.gender !== undefined) teacher.gender = data.gender;
    if (data.age !== undefined) teacher.age = data.age;
    if (data.specialization !== undefined) teacher.specialization = data.specialization;
    if (data.subject !== undefined) teacher.currentSubjectCourse = data.subject;
    if (data.experience !== undefined) teacher.experience = data.experience;
    if (data.qualification !== undefined) teacher.qualification = data.qualification;
    if (data.joiningDate !== undefined) teacher.joiningDate = data.joiningDate;
    if (data.address !== undefined) teacher.address = data.address;
    if (data.profileImage !== undefined) teacher.photo = data.profileImage || undefined;
    if (data.salary !== undefined) teacher.salary = data.salary;
    if (data.status !== undefined) teacher.status = data.status;

    await teacher.save();

    return NextResponse.json({
      success: true,
      data: { teacher: toTeacherJson(teacher) },
      message: "Teacher updated in teachers collection",
    });
  } catch (error) {
    console.error("[senior-teacher/teachers/[id] PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update teacher" }, { status: 500 });
  }
}
