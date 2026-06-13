import { NextRequest, NextResponse } from "next/server";
import { requireStudentFromRequest } from "@/lib/auth/require-student";
import { validateReferralCode } from "@/lib/referral/referralService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireStudentFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const code = typeof body?.referralCode === "string" ? body.referralCode : "";

    const result = await validateReferralCode(code, auth.student.id);
    if (result.valid === false) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      message: "Referral Applied Successfully",
      referralCode: result.referralCode,
      referrerName: result.referrerName,
      referrerId: result.referrerId,
      referralPercentage: result.referralPercentage,
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 },
    );
  }
}
