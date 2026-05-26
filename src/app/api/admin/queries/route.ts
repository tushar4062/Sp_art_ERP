import { NextRequest } from "next/server";
import dbConnect from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { fetchAllAdminQueries } from "@/lib/admin/unifiedQueries";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const status = (searchParams.get("status") || "all").trim().toLowerCase();
    const roleType = (searchParams.get("roleType") || "all").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12", 10) || 12));

    const all = await fetchAllAdminQueries({ search, status, roleType });
    const total = all.length;
    const skip = (page - 1) * limit;
    const queries = all.slice(skip, skip + limit);

    return apiSuccess({
      queries,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e) {
    console.error("[admin/queries GET]", e);
    return apiError("Failed to load queries", 500);
  }
}
