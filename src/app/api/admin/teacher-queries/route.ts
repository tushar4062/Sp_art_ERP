import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import Query from "@/lib/models/Query";
import { migrateAllQueriesCollections } from "@/lib/queries/queryAccess";
import {
  applyTeacherQueryFilters,
  serializeTeacherQuery,
  type TeacherQueryDto,
} from "@/lib/teacher/teacherQueryAccess";

export const runtime = "nodejs";

/** @deprecated Use GET /api/admin/queries?roleType=teacher */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();
    await migrateAllQueriesCollections();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const status = (searchParams.get("status") || "all").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12));

    const filter: Record<string, unknown> = { role: "teacher" };
    if (status && status !== "all") {
      filter.status = status;
    }

    const allRows = await Query.find(filter).sort({ createdAt: -1 }).lean();
    let dtos: TeacherQueryDto[] = allRows.map(r => serializeTeacherQuery(r));

    if (search) {
      dtos = applyTeacherQueryFilters(dtos, { search, status: "all" });
    }

    const total = dtos.length;
    const skip = (page - 1) * limit;
    const queries = dtos.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        queries,
        total,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (e) {
    console.error("[admin/teacher-queries GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load teacher queries" }, { status: 500 });
  }
}
