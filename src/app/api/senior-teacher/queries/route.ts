import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import Query from "@/lib/models/Query";
import { migrateAllQueriesCollections } from "@/lib/queries/queryAccess";
import { requireSeniorTeacherFromRequest } from "@/lib/auth/require-senior-teacher";
import {
  getSeniorTeacherProfileEditAccess,
  serializeSeniorTeacherQuery,
} from "@/lib/senior-teacher/seniorTeacherQueryAccess";
import { sendNewSeniorTeacherQueryEmails } from "@/lib/email/seniorTeacherQueryEmail";

export const runtime = "nodejs";

const createSchema = z.object({
  seniorTeacherName: z.string().trim().min(2, "Name must be at least 2 characters"),
  seniorTeacherEmail: z.string().trim().email("Enter a valid email"),
  remarks: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();
    await migrateAllQueriesCollections();
    const access = await getSeniorTeacherProfileEditAccess(auth.seniorTeacher.id);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10) || 10));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      Query.find({ role: "senior_teacher", userId: auth.seniorTeacher.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Query.countDocuments({ role: "senior_teacher", userId: auth.seniorTeacher.id }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        queries: rows.map(r => serializeSeniorTeacherQuery(r)),
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
    console.error("[senior-teacher/queries GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load queries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSeniorTeacherFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    await migrateAllQueriesCollections();
    const senior = await SeniorTeacher.findById(auth.seniorTeacher.id);
    if (!senior) {
      return NextResponse.json({ success: false, error: "Senior teacher not found" }, { status: 404 });
    }

    const pending = await Query.findOne({
      role: "senior_teacher",
      userId: senior._id,
      status: "pending",
    }).lean();
    if (pending) {
      return NextResponse.json(
        { success: false, error: "You already have a pending query. Please wait for admin review." },
        { status: 400 },
      );
    }

    const doc = await Query.create({
      role: "senior_teacher",
      userId: senior._id,
      personName: parsed.data.seniorTeacherName,
      personEmail: parsed.data.seniorTeacherEmail.toLowerCase(),
      remarks: parsed.data.remarks,
      status: "pending",
      adminRemark: "",
    });

    const emailWarnings = await sendNewSeniorTeacherQueryEmails({
      seniorTeacherName: doc.personName,
      seniorTeacherEmail: doc.personEmail,
      remarks: doc.remarks,
    }).catch(err => {
      console.error("[senior-teacher/queries POST] email", err);
      return ["Email could not be sent — check SMTP settings"];
    });

    const access = await getSeniorTeacherProfileEditAccess(auth.seniorTeacher.id);

    return NextResponse.json(
      {
        success: true,
        message: "Query submitted successfully",
        data: {
          query: serializeSeniorTeacherQuery(doc),
          canEditProfile: access.canEditProfile,
          emailWarnings,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    console.error("[senior-teacher/queries POST]", e);
    return NextResponse.json({ success: false, error: "Failed to submit query" }, { status: 500 });
  }
}
