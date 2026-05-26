import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import {
  findQueryByIdAndRole,
  migrateAllQueriesCollections,
  normalizeQueryFields,
} from "@/lib/queries/queryAccess";
import { serializeTeacherQuery } from "@/lib/teacher/teacherQueryAccess";
import { sendTeacherQueryStatusEmail } from "@/lib/email/teacherQueryEmail";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminRemark: z.string().trim().optional(),
});

/** @deprecated Use PATCH /api/admin/queries/[id] with roleType=teacher */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid query" }, { status: 400 });
    }

    await dbConnect();
    await migrateAllQueriesCollections();
    const doc = await findQueryByIdAndRole(id, "teacher");
    if (!doc) {
      return NextResponse.json({ success: false, error: "Query not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { query: serializeTeacherQuery(doc) } });
  } catch (e) {
    console.error("[admin/teacher-queries/[id] GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load query" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid query" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join("; ") },
        { status: 422 },
      );
    }

    await dbConnect();
    await migrateAllQueriesCollections();
    const doc = await findQueryByIdAndRole(id, "teacher");
    if (!doc) {
      return NextResponse.json({ success: false, error: "Query not found" }, { status: 404 });
    }

    if (doc.status !== "pending") {
      return NextResponse.json({ success: false, error: "This query was already reviewed" }, { status: 400 });
    }

    const approved = parsed.data.action === "approve";
    const adminRemark = parsed.data.adminRemark?.trim() || "";
    doc.status = approved ? "approved" : "rejected";
    doc.adminRemark = adminRemark;
    doc.reviewedAt = new Date();
    await doc.save();

    const fields = normalizeQueryFields(doc);
    try {
      await sendTeacherQueryStatusEmail(
        fields.personEmail,
        {
          teacherName: fields.personName,
          teacherEmail: fields.personEmail,
          remarks: fields.remarks,
          status: doc.status.charAt(0).toUpperCase() + doc.status.slice(1),
          adminRemark: doc.adminRemark,
        },
        approved,
      );
    } catch (e) {
      console.error("[admin/teacher-queries PATCH] email", e);
    }

    return NextResponse.json({
      success: true,
      message: approved ? "Query approved" : "Query rejected",
      data: { query: serializeTeacherQuery(doc) },
    });
  } catch (e) {
    console.error("[admin/teacher-queries PATCH]", e);
    return NextResponse.json({ success: false, error: "Failed to update query" }, { status: 500 });
  }
}
