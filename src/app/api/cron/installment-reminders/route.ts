import { NextRequest, NextResponse } from "next/server";
import { runInstallmentReminders } from "@/lib/enrollment/installmentReminderService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.ADMIN_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runInstallmentReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reminder job failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
