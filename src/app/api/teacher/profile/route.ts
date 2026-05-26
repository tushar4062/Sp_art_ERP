import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Teacher, { type TeacherDocument } from "@/lib/models/Teacher";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { getTeacherProfileEditAccess } from "@/lib/teacher/teacherQueryAccess";

export const runtime = "nodejs";

const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().trim().max(30).optional(),
  gender: z.string().trim().max(30).optional(),
  specialization: z.string().trim().min(1, "Specialization is required").optional(),
  profileImage: z
    .string()
    .optional()
    .refine(v => !v || v.startsWith("http"), "Profile image must be a valid URL"),
});

function teacherToProfile(teacher: TeacherDocument) {
  const assignedBatches =
    teacher.classes?.length > 0 ? teacher.classes.join(", ") : teacher.batchDetails ?? "";
  return {
    id: teacher._id.toString(),
    fullName: teacher.fullName,
    email: teacher.email,
    phone: teacher.phone ?? "",
    gender: teacher.gender ?? "",
    teacherId: teacher.badgeId ?? "",
    specialization: teacher.specialization,
    assignedBatches,
    courseName: teacher.currentSubjectCourse ?? teacher.className ?? "",
    joiningDate: teacher.joiningDate ?? "",
    salary: teacher.salary ?? null,
    branchName: teacher.branchName ?? "",
    role: teacher.role ?? "Teacher",
    profileImage: teacher.photo ?? "",
    dob: teacher.dob ?? "",
    age: teacher.age ?? null,
    bloodGroup: teacher.bloodGroup ?? "",
    schoolCollege: teacher.schoolCollege ?? "",
    parentGuardianDetails: teacher.parentGuardianDetails ?? "",
    address: teacher.address ?? "",
    className: teacher.className ?? "",
    experience: teacher.experience,
    batchDetails: teacher.batchDetails ?? "",
    qualification: teacher.qualification ?? "",
    bio: teacher.bio ?? "",
    status: teacher.status,
    classes: teacher.classes ?? [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();
    const teacher = await Teacher.findById(auth.teacher.id);
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const access = await getTeacherProfileEditAccess(auth.teacher.id);

    return NextResponse.json({
      success: true,
      data: {
        profile: teacherToProfile(teacher),
        canEditProfile: access.canEditProfile,
        latestQuery: access.latestQuery,
      },
    });
  } catch (error) {
    console.error("[teacher/profile GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();

    const access = await getTeacherProfileEditAccess(auth.teacher.id);
    if (!access.canEditProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile editing is locked. Submit a query and wait for admin approval.",
        },
        { status: 403 },
      );
    }

    const teacher = await Teacher.findById(auth.teacher.id);
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const data = parsed.data;
    if (data.fullName !== undefined) teacher.fullName = data.fullName;
    if (data.phone !== undefined) teacher.phone = data.phone;
    if (data.gender !== undefined) teacher.gender = data.gender;
    if (data.specialization !== undefined) teacher.specialization = data.specialization;
    if (data.profileImage !== undefined) {
      teacher.photo = data.profileImage || undefined;
    }

    await teacher.save();

    return NextResponse.json({
      success: true,
      data: { profile: teacherToProfile(teacher) },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("[teacher/profile PUT]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
