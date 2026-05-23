import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import SeniorTeacher from "@/lib/models/SeniorTeacher";
import Teacher from "@/lib/models/Teacher";
import { requireAdminFromRequest } from "@/lib/auth/require-admin";
import { findCredentialByEmail } from "@/lib/auth/findCredential";
import { normalizeEmail } from "@/lib/auth/normalizeEmail";
import { ensureSeniorTeacherCredential } from "@/lib/auth/ensureSeniorTeacherCredential";
import { ensureTeacherCredential } from "@/lib/auth/ensureTeacherCredential";

export const runtime = "nodejs";

/**
 * Creates login credentials for staff profiles that do not have one yet.
 * Admin-only. Returns generated passwords when email could not be sent.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminFromRequest(request);
    if (!auth.ok) return auth.response;

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const scope = (body as { scope?: string }).scope ?? "all";

    const created: { email: string; role: string; password?: string; emailSent?: boolean }[] = [];
    const skipped: string[] = [];

    if (scope === "all" || scope === "senior_teacher") {
      const seniors = await SeniorTeacher.find().select("fullName email phone status");
      for (const s of seniors) {
        const email = normalizeEmail(s.email);
        if (!email) {
          skipped.push(`senior:${s._id}:no-email`);
          continue;
        }
        const existing = await findCredentialByEmail(email);
        if (existing) {
          skipped.push(`senior:${email}:exists`);
          continue;
        }
        const result = await ensureSeniorTeacherCredential({
          name: s.fullName,
          email,
          mobileNumber: s.phone,
          accountStatus: s.status === "Inactive" ? "Inactive" : "Active",
          createdBy: "admin-sync",
        });
        if (result.created) {
          created.push({
            email,
            role: "senior_teacher",
            password: result.emailSent ? undefined : result.password,
            emailSent: result.emailSent,
          });
        }
      }
    }

    if (scope === "all" || scope === "teacher") {
      const teachers = await Teacher.find().select("fullName email phone status");
      for (const t of teachers) {
        const email = normalizeEmail(t.email);
        if (!email) {
          skipped.push(`teacher:${t._id}:no-email`);
          continue;
        }
        const existing = await findCredentialByEmail(email);
        if (existing) {
          skipped.push(`teacher:${email}:exists`);
          continue;
        }
        const result = await ensureTeacherCredential({
          name: t.fullName,
          email,
          mobileNumber: t.phone,
          accountStatus: t.status === "Inactive" ? "Inactive" : "Active",
          createdBy: "admin-sync",
        });
        if (result.created) {
          created.push({
            email,
            role: "teacher",
            password: result.emailSent ? undefined : result.password,
            emailSent: result.emailSent,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${created.length} credential(s).`,
      data: { created, skippedCount: skipped.length },
    });
  } catch (e) {
    console.error("[admin/sync-staff-credentials]", e);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}
