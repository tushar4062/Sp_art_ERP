import { NextRequest, NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { sendManualReminderForInstallment } from "@/lib/enrollment/installmentReminderService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const installmentId = typeof body?.installmentId === "string" ? body.installmentId.trim() : "";
    if (!installmentId) {
      return NextResponse.json({ error: "installmentId is required" }, { status: 400 });
    }

    await sendManualReminderForInstallment(installmentId);
    return NextResponse.json({ success: true, message: "Reminder sent" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminder" },
      { status: 500 },
    );
  }
}
