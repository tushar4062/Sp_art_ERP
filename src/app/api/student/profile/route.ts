import { NextRequest } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { findStudentById, toProfileDto, updateStudentProfile } from "@/lib/student-portal";
import { getStudentProfileEditAccess } from "@/lib/student/studentQueryAccess";
import { findBatchesForStudent } from "@/lib/student/studentBatches";

export const runtime = "nodejs";

const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().trim().max(20).optional(),
  age: z.number().int().min(1).max(120).nullable().optional(),
  gender: z.string().trim().max(30).optional(),
  profileImage: z
    .string()
    .optional()
    .refine(v => !v || v.startsWith("http"), "Profile image must be a valid URL"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();

    const student = await findStudentById(auth.student.id);
    if (!student) {
      return apiError("Student not found in students collection", 404);
    }

    const access = await getStudentProfileEditAccess(auth.student.id);
    const classes = await findBatchesForStudent(student);
    const currentClass = classes[0] ?? null;

    const profile = toProfileDto(student);
    profile.classes = classes.map(c => ({
      id: c.id,
      batchName: c.batchName,
      batchTiming: c.batchTime,
      courseName: c.courseName,
      teacherName: c.teachers,
    }));

    if (currentClass) {
      profile.batchName = currentClass.batchName;
      profile.batchTiming = currentClass.batchTime;
      profile.courseName = currentClass.courseName;
      profile.teacherName = currentClass.teachers;
    }

    return apiSuccess({
      profile,
      canEditProfile: access.canEditProfile,
      latestQuery: access.latestQuery,
    });
  } catch (error) {
    console.error("[student/profile GET]", error);
    return apiError("Failed to load profile", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map(e => e.message).join("; "), 422);
    }

    await dbConnect();

    const access = await getStudentProfileEditAccess(auth.student.id);
    if (!access.canEditProfile) {
      return apiError(
        "Profile editing is locked. Submit a query and wait for admin approval.",
        403,
      );
    }

    const student = await updateStudentProfile(auth.student.id, "", parsed.data);

    if (!student) {
      return apiError(
        "Student not found in students collection. Log in with the email on your student record.",
        404,
      );
    }

    return apiSuccess(
      { profile: toProfileDto(student) },
      { message: "Profile saved to students collection" },
    );
  } catch (error) {
    console.error("[student/profile PUT]", error);
    return apiError("Failed to update profile", 500);
  }
}
