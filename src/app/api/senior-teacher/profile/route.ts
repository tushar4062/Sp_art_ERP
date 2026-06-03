import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import SeniorTeacher, { type SeniorTeacherDocument } from "@/lib/models/SeniorTeacher";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import { getSeniorTeacherProfileEditAccess } from "@/lib/senior-teacher/seniorTeacherQueryAccess";

export const runtime = "nodejs";

const GENDER_VALUES = ["Male", "Female", "Other"] as const;

const updateSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().trim().max(30).optional(),
  gender: z
    .string()
    .trim()
    .optional()
    .transform(v => (v && v !== "unset" ? v : "")),
  specialization: z.string().trim().min(1, "Specialization is required").optional(),
  profileImage: z
    .string()
    .optional()
    .refine(v => !v || v.startsWith("http"), "Profile image must be a valid URL"),
});

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function seniorToProfile(doc: SeniorTeacherDocument) {
  const assignedBatches =
    doc.assignedClasses > 0 ? `${doc.assignedClasses} class(es) assigned` : "No batches assigned yet";
  return {
    id: doc._id.toString(),
    fullName: doc.fullName,
    email: doc.email,
    phone: doc.phone ?? "",
    gender: doc.gender ?? "",
    teacherId: doc.badgeId ?? "",
    specialization: doc.specialization,
    assignedBatches,
    courseName: doc.courseName ?? doc.specialization ?? "",
    joiningDate: formatDate(doc.joiningDate),
    salary: doc.salary ?? null,
    branchName: doc.branchName ?? "",
    role: doc.role ?? "Senior Teacher",
    profileImage: doc.profileImage ?? "",
    yearsOfExperience: doc.yearsOfExperience,
    qualification: doc.qualification ?? "",
    address: doc.address ?? "",
    bio: doc.bio ?? "",
    status: doc.status,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json(
        { success: false, error: "Senior teacher not found in seniorteachers collection" },
        { status: 404 },
      );
    }

    const access = await getSeniorTeacherProfileEditAccess(auth.seniorTeacher.id);

    return NextResponse.json({
      success: true,
      data: {
        profile: seniorToProfile(senior),
        canEditProfile: access.canEditProfile,
        latestQuery: access.latestQuery,
      },
    });
  } catch (error) {
    console.error("[senior-teacher/profile GET]", error);
    return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();

    const access = await getSeniorTeacherProfileEditAccess(auth.seniorTeacher.id);
    if (!access.canEditProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile editing is locked. Submit a query and wait for admin approval.",
        },
        { status: 403 },
      );
    }

    const data = parsed.data;
    const $set: Record<string, string> = {};
    const $unset: Record<string, 1> = {};

    if (data.fullName !== undefined) $set.fullName = data.fullName;
    if (data.phone !== undefined) $set.phone = data.phone;
    if (data.gender !== undefined) {
      const g = data.gender.trim();
      if (!g) {
        $unset.gender = 1;
      } else if (!GENDER_VALUES.includes(g as (typeof GENDER_VALUES)[number])) {
        return NextResponse.json(
          { success: false, error: "Gender must be Male, Female, or Other" },
          { status: 422 },
        );
      } else {
        $set.gender = g;
      }
    }
    if (data.specialization !== undefined) $set.specialization = data.specialization;
    if (data.profileImage !== undefined) {
      if (data.profileImage) $set.profileImage = data.profileImage;
      else $unset.profileImage = 1;
    }

    const updateQuery: { $set?: Record<string, string>; $unset?: Record<string, 1> } = {};
    if (Object.keys($set).length) updateQuery.$set = $set;
    if (Object.keys($unset).length) updateQuery.$unset = $unset;

    const updated = await SeniorTeacher.findByIdAndUpdate(auth.seniorTeacher.id, updateQuery, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Senior teacher not found in seniorteachers collection" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { profile: seniorToProfile(updated) },
      message: "Profile saved to seniorteachers collection",
    });
  } catch (error) {
    console.error("[senior-teacher/profile PUT]", error);
    const message =
      error instanceof Error && error.name === "ValidationError"
        ? error.message
        : "Failed to update profile";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
