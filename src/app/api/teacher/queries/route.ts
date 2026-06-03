import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import Teacher from "@/lib/models/Teacher";
import Query from "@/lib/models/Query";
import { migrateAllQueriesCollections } from "@/lib/queries/queryAccess";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import {
  getTeacherProfileEditAccess,
  serializeTeacherQuery,
} from "@/lib/teacher/teacherQueryAccess";
import { sendNewTeacherQueryEmails } from "@/lib/email/teacherQueryEmail";

export const runtime = "nodejs";

const createSchema = z.object({
  teacherName: z.string().trim().min(2, "Name must be at least 2 characters"),
  teacherEmail: z.string().trim().email("Enter a valid email"),
  remarks: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    await migrateAllQueriesCollections();
    const access = await getTeacherProfileEditAccess(auth.teacher.id);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Query.find({ role: "teacher", userId: auth.teacher.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Query.countDocuments({ role: "teacher", userId: auth.teacher.id }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queries: rows.map(r => serializeTeacherQuery(r)),
        latestQuery: access.latestQuery,
        canEditProfile: access.canEditProfile,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (e) {
    console.error("[teacher/queries GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load queries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    const teacher = await Teacher.findById(auth.teacher.id);
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const pending = await Query.findOne({
      role: "teacher",
      userId: teacher._id,
      status: "pending",
    }).lean();
    if (pending) {
      return NextResponse.json(
        { success: false, error: "You already have a pending query. Please wait for admin review." },
        { status: 400 },
      );
    }

    const doc = await Query.create({
      role: "teacher",
      userId: teacher._id,
      personName: parsed.data.teacherName,
      personEmail: parsed.data.teacherEmail.toLowerCase(),
      remarks: parsed.data.remarks,
      status: "pending",
      adminRemark: "",
    });

    const emailWarnings = await sendNewTeacherQueryEmails({
      teacherName: doc.personName,
      teacherEmail: doc.personEmail,
      remarks: doc.remarks,
    }).catch(err => {
      console.error("[teacher/queries POST] email", err);
      return ["Email could not be sent — check SMTP settings"];
    });

    const access = await getTeacherProfileEditAccess(auth.teacher.id);

    return NextResponse.json(
      {
        success: true,
        message: "Query submitted successfully",
        data: {
          query: serializeTeacherQuery(doc),
          canEditProfile: access.canEditProfile,
          emailWarnings,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[teacher/queries POST]", e);
    return NextResponse.json({ success: false, error: "Failed to submit query" }, { status: 500 });
  }
}
