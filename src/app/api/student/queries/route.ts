import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { findStudentById } from "@/lib/student-portal";
import Query from "@/lib/models/Query";
import {
  getStudentProfileEditAccess,
  migrateAllQueriesCollections,
  serializeStudentQuery,
} from "@/lib/student/studentQueryAccess";
import { sendNewStudentQueryEmails } from "@/lib/email/queryEmail";

export const runtime = "nodejs";

const createSchema = z.object({
  studentName: z.string().trim().min(2, "Name must be at least 2 characters"),
  studentEmail: z.string().trim().email("Enter a valid email"),
  remarks: z.string().trim().min(10, "Remarks must be at least 10 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();
    await migrateAllQueriesCollections();
    const access = await getStudentProfileEditAccess(auth.student.id);
    const rows = await Query.find({ role: "student", userId: auth.student.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return apiSuccess({
      queries: rows.map(r => serializeStudentQuery(r)),
      latestQuery: access.latestQuery,
      canEditProfile: access.canEditProfile,
    });
  } catch (e) {
    console.error("[student/queries GET]", e);
    return apiError("Failed to load queries", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map(e => e.message).join("; "), 422);
    }

    await dbConnect();
    const student = await findStudentById(auth.student.id);
    if (!student) return apiError("Student not found", 404);

    await migrateAllQueriesCollections();

    const pending = await Query.findOne({
      role: "student",
      userId: student._id,
      status: "pending",
    }).lean();
    if (pending) {
      return apiError("You already have a pending query. Please wait for admin review.", 400);
    }

    const doc = await Query.create({
      role: "student",
      userId: student._id,
      personName: parsed.data.studentName,
      personEmail: parsed.data.studentEmail.toLowerCase(),
      remarks: parsed.data.remarks,
      status: "pending",
      adminRemark: "",
    });

    const emailWarnings = await sendNewStudentQueryEmails({
      studentName: doc.personName,
      studentEmail: doc.personEmail,
      remarks: doc.remarks,
    }).catch(err => {
      console.error("[student/queries POST] email", err);
      return ["Email could not be sent — check SMTP settings"];
    });

    const access = await getStudentProfileEditAccess(auth.student.id);

    return apiSuccess(
      {
        query: serializeStudentQuery(doc),
        canEditProfile: access.canEditProfile,
        emailWarnings,
      },
      { message: "Query submitted successfully", status: 201 },
    );
  } catch (e) {
    console.error("[student/queries POST]", e);
    return apiError("Failed to submit query", 500);
  }
}
