import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import dbConnect from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import Query from "@/lib/models/Query";
import {
  findQueryByIdAndRole,
  migrateAllQueriesCollections,
  normalizeQueryFields,
  toUnifiedAdminQuery,
  type QueryRoleType,
} from "@/lib/queries/queryAccess";
import { sendStudentQueryStatusEmail } from "@/lib/email/queryEmail";
import { sendTeacherQueryStatusEmail } from "@/lib/email/teacherQueryEmail";
import { sendSeniorTeacherQueryStatusEmail } from "@/lib/email/seniorTeacherQueryEmail";

export const runtime = "nodejs";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "update_remark"]),
  adminRemark: z.string().trim().optional(),
  roleType: z.enum(["student", "teacher", "senior_teacher"]),
});

function parseRoleType(value: string | null): QueryRoleType | null {
  if (value === "student" || value === "teacher" || value === "senior_teacher") return value;
  return null;
}

async function sendStatusEmailForRole(
  role: QueryRoleType,
  personName: string,
  personEmail: string,
  remarks: string,
  status: string,
  adminRemark: string,
  approved: boolean,
) {
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  if (role === "teacher") {
    await sendTeacherQueryStatusEmail(
      personEmail,
      {
        teacherName: personName,
        teacherEmail: personEmail,
        remarks,
        status: statusLabel,
        adminRemark,
      },
      approved,
    );
    return;
  }
  if (role === "senior_teacher") {
    await sendSeniorTeacherQueryStatusEmail(
      personEmail,
      {
        seniorTeacherName: personName,
        seniorTeacherEmail: personEmail,
        remarks,
        status: statusLabel,
        adminRemark,
      },
      approved,
    );
    return;
  }
  await sendStudentQueryStatusEmail(
    personEmail,
    {
      studentName: personName,
      studentEmail: personEmail,
      remarks,
      status: statusLabel,
      adminRemark,
    },
    approved,
  );
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
      return apiError("Invalid query", 400);
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors.map(e => e.message).join("; "), 422);
    }

    const roleType =
      parsed.data.roleType ||
      parseRoleType(new URL(request.url).searchParams.get("roleType"));
    if (!roleType) {
      return apiError("roleType (student, teacher, or senior_teacher) is required", 400);
    }

    await dbConnect();
    await migrateAllQueriesCollections();

    const doc = await findQueryByIdAndRole(id, roleType);
    if (!doc) return apiError("Query not found", 404);

    const adminRemark = parsed.data.adminRemark?.trim() || "";
    const fields = normalizeQueryFields(doc);

    if (parsed.data.action === "update_remark") {
      doc.adminRemark = adminRemark;
      await doc.save();
      return apiSuccess({
        query: toUnifiedAdminQuery(doc),
        message: "Remark saved",
      });
    }

    if (doc.status !== "pending") {
      return apiError("This query was already reviewed", 400);
    }

    const approved = parsed.data.action === "approve";
    doc.status = approved ? "approved" : "rejected";
    doc.adminRemark = adminRemark;
    doc.reviewedAt = new Date();
    await doc.save();

    try {
      await sendStatusEmailForRole(
        fields.role,
        fields.personName,
        fields.personEmail,
        fields.remarks,
        doc.status,
        doc.adminRemark || "",
        approved,
      );
    } catch (e) {
      console.error("[admin/queries PATCH] email", e);
    }

    return apiSuccess({
      query: toUnifiedAdminQuery(doc),
      message: approved ? "Query approved" : "Query rejected",
    });
  } catch (e) {
    console.error("[admin/queries PATCH]", e);
    return apiError("Failed to update query", 500);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const roleType = parseRoleType(new URL(request.url).searchParams.get("roleType"));
    if (!mongoose.Types.ObjectId.isValid(id) || !roleType) {
      return apiError("Invalid query or missing roleType", 400);
    }

    await dbConnect();
    await migrateAllQueriesCollections();

    const doc = await findQueryByIdAndRole(id, roleType);
    if (!doc) return apiError("Query not found", 404);

    return apiSuccess({ query: toUnifiedAdminQuery(doc) });
  } catch (e) {
    console.error("[admin/queries/[id] GET]", e);
    return apiError("Failed to load query", 500);
  }
}
