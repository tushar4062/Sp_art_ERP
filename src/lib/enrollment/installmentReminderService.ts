import dbConnect from "@/lib/mongodb";
import EnrollmentInstallment from "@/lib/models/EnrollmentInstallment";
import CourseEnrollment from "@/lib/models/CourseEnrollment";
import Course from "@/lib/models/Course";
import Student from "@/lib/models/Student";
import {
  sendInstallmentReminderEmail,
  sendOverdueInstallmentEmail,
} from "@/lib/email/installmentReminderEmail";
import { syncOverdueInstallments } from "@/lib/enrollment/enrollmentPaymentService";

function daysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

export type ReminderRunResult = {
  remindersSent: number;
  overdueSent: number;
  errors: string[];
};

export async function runInstallmentReminders(): Promise<ReminderRunResult> {
  await dbConnect();
  const result: ReminderRunResult = { remindersSent: 0, overdueSent: 0, errors: [] };

  const enrollments = await CourseEnrollment.find({ paymentType: "installment" });
  for (const enrollment of enrollments) {
    await syncOverdueInstallments(enrollment._id);
  }

  const pending = await EnrollmentInstallment.find({
    paymentStatus: { $in: ["pending", "overdue"] },
  });

  for (const inst of pending) {
    try {
      const enrollment = await CourseEnrollment.findById(inst.enrollmentId);
      if (!enrollment) continue;
      const course = await Course.findById(enrollment.courseId);
      const student = await Student.findById(enrollment.studentId);
      if (!course || !student?.email) continue;

      const days = daysUntil(inst.dueDate);
      const dueDateStr = formatDate(inst.dueDate);
      const reminderKey =
        days === 7 ? "7d" : days === 3 ? "3d" : days === 1 ? "1d" : null;

      if (reminderKey && !inst.remindersSent.includes(reminderKey)) {
        await sendInstallmentReminderEmail({
          studentEmail: student.email,
          studentName: student.fullName,
          courseName: course.courseTitle,
          termNo: inst.termNo,
          amount: inst.amount,
          dueDate: dueDateStr,
        });
        inst.remindersSent = [...inst.remindersSent, reminderKey];
        await inst.save();
        result.remindersSent++;
      }

      if (inst.paymentStatus === "overdue" && !inst.remindersSent.includes("overdue")) {
        const allPending = await EnrollmentInstallment.find({
          enrollmentId: enrollment._id,
          paymentStatus: { $in: ["pending", "overdue"] },
        }).sort({ termNo: 1 });
        const dueAmount = allPending.reduce((s, i) => s + i.amount, 0);
        await sendOverdueInstallmentEmail({
          studentEmail: student.email,
          studentName: student.fullName,
          courseName: course.courseTitle,
          dueAmount,
          dueDate: dueDateStr,
          pendingTerms: allPending.map(i => i.termNo),
        });
        inst.remindersSent = [...inst.remindersSent, "overdue"];
        await inst.save();
        result.overdueSent++;
      }
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return result;
}

export async function sendManualReminderForInstallment(installmentId: string) {
  await dbConnect();
  const inst = await EnrollmentInstallment.findById(installmentId);
  if (!inst) throw new Error("Installment not found");
  if (inst.paymentStatus === "paid") throw new Error("Installment already paid");

  const enrollment = await CourseEnrollment.findById(inst.enrollmentId);
  const course = enrollment ? await Course.findById(enrollment.courseId) : null;
  const student = enrollment ? await Student.findById(enrollment.studentId) : null;
  if (!enrollment || !course || !student?.email) throw new Error("Enrollment data incomplete");

  const dueDateStr = formatDate(inst.dueDate);
  if (inst.paymentStatus === "overdue") {
    const allPending = await EnrollmentInstallment.find({
      enrollmentId: enrollment._id,
      paymentStatus: { $in: ["pending", "overdue"] },
    }).sort({ termNo: 1 });
    await sendOverdueInstallmentEmail({
      studentEmail: student.email,
      studentName: student.fullName,
      courseName: course.courseTitle,
      dueAmount: allPending.reduce((s, i) => s + i.amount, 0),
      dueDate: dueDateStr,
      pendingTerms: allPending.map(i => i.termNo),
    });
  } else {
    await sendInstallmentReminderEmail({
      studentEmail: student.email,
      studentName: student.fullName,
      courseName: course.courseTitle,
      termNo: inst.termNo,
      amount: inst.amount,
      dueDate: dueDateStr,
    });
  }
}
