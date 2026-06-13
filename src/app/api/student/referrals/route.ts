import { NextRequest, NextResponse } from "next/server";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { getStudentReferralDashboard } from "@/lib/referral/referralService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const dashboard = await getStudentReferralDashboard(auth.student.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load referrals" },
      { status: 500 },
    );
  }
}
