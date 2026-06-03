import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Teacher from "@/lib/models/Teacher";
import Leave, { type LeaveDocument } from "@/lib/models/Leave";
import { requireTeacherFromRequest } from "@/lib/auth/require-teacher";
import { validateLeaveDateRange } from "@/lib/leave/dateValidation";
import {
  countLeaveDays,
  getOrCreateBalance,
  serializeLeave,
} from "@/lib/leave/utils";
import {
  DUPLICATE_LEAVE_ERROR,
  createLeaveWithDuplicateProtection,
} from "@/lib/leave/duplicateLeave.server";
import { getAdminNotifyEmails, sendNewLeaveRequestEmails } from "@/lib/leave/leaveEmail";
import type { LeaveType } from "@/lib/models/Leave";

export const runtime = "nodejs";

const LEAVE_TYPES: LeaveType[] = ["Casual", "Sick", "Personal"];

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    await dbConnect();
    const [leaves, balance] = await Promise.all([
      Leave.find({ teacherId: auth.teacher.id }).sort({ createdAt: -1 }),
      getOrCreateBalance(auth.teacher.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        leaves: leaves.map(serializeLeave),
        balance: { casual: balance.casual, sick: balance.sick, personal: balance.personal },
      },
    });
  } catch (e) {
    console.error("[teacher/leaves GET]", e);
    return NextResponse.json({ success: false, error: "Failed to load leaves" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireTeacherFromRequest(request);
    if (!auth.ok) return (auth as { ok: false; response: import("next/server").NextResponse }).response;

    const body = await request.json();
    const leaveType = (body.leaveType || body.type || "").trim() as LeaveType;
    const fromDate = (body.fromDate || body.from || "").trim();
    const toDate = (body.toDate || body.to || "").trim();
    const reason = (body.reason || "").trim();

    if (!LEAVE_TYPES.includes(leaveType)) {
      return NextResponse.json({ success: false, error: "Invalid leave type" }, { status: 400 });
    }
    const dateCheck = validateLeaveDateRange(fromDate, toDate);
    if (dateCheck.ok === false) {
      return NextResponse.json({ success: false, error: dateCheck.error }, { status: 400 });
    }

    await dbConnect();
    const teacher = await Teacher.findById(auth.teacher.id);
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    const daysCount = countLeaveDays(fromDate, toDate);

    const created = await createLeaveWithDuplicateProtection<LeaveDocument>(
      Leave,
      "teacherId",
      auth.teacher.id,
      { leaveType, fromDate, toDate, reason },
      storedReason => ({
        teacherId: teacher._id,
        teacherName: teacher.fullName,
        teacherEmail: (teacher.email || "").toLowerCase(),
        leaveType,
        fromDate,
        toDate,
        reason: storedReason,
        status: "Pending",
        adminRemark: "",
        daysCount,
      }),
    );

    if (!created.ok) {
      return NextResponse.json(
        { success: false, error: DUPLICATE_LEAVE_ERROR, code: "DUPLICATE_LEAVE" },
        { status: 409 },
      );
    }

    const doc = created.doc;

    const notifyEmails = [...getAdminNotifyEmails()];

    const emailFields = {
      teacherName: doc.teacherName,
      leaveType: doc.leaveType,
      fromDate: doc.fromDate,
      toDate: doc.toDate,
      reason: doc.reason,
      status: "Pending",
    };

    let emailWarning: string | undefined;
    try {
      const failed = await sendNewLeaveRequestEmails(emailFields, notifyEmails);
      if (failed.length) emailWarning = "Leave saved; some notification emails could not be sent.";
    } catch (err) {
      console.error("[teacher/leaves email]", err);
      emailWarning = "Leave saved; email notification failed.";
    }

    return NextResponse.json({
      success: true,
      data: { leave: serializeLeave(doc) },
      message: emailWarning || "Leave request submitted successfully",
    });
  } catch (e) {
    console.error("[teacher/leaves POST]", e);
    return NextResponse.json({ success: false, error: "Failed to submit leave request" }, { status: 500 });
  }
}
