import { sendTransactionalEmail } from "@/lib/email/mailer";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildInstallmentReminderHtml(params: {
  studentName: string;
  courseName: string;
  termNo: number;
  amount: number;
  dueDate: string;
}) {
  const { studentName, courseName, termNo, amount, dueDate } = params;
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Installment Due Reminder</h1>
    <p style="margin:0 0 16px;color:#475569;line-height:1.7;">Dear ${escapeHtml(studentName)},</p>
    <p style="margin:0 0 20px;color:#475569;line-height:1.7;">Your installment payment due date is approaching.</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;color:#64748b;">Course</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${escapeHtml(courseName)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Installment</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">Term ${termNo}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Amount</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${formatInr(amount)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Due Date</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${escapeHtml(dueDate)}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#475569;line-height:1.7;">Please complete the payment before the due date.</p>
    <p style="margin:16px 0 0;color:#475569;">Thank You.</p>
  </div>
</body>
</html>`;
}

export function buildOverdueInstallmentHtml(params: {
  studentName: string;
  courseName: string;
  dueAmount: number;
  dueDate: string;
  pendingTerms: number[];
}) {
  const { studentName, courseName, dueAmount, dueDate, pendingTerms } = params;
  const terms = pendingTerms.map(t => `Term ${t}`).join(", ");
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f3f4f6;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
    <h1 style="margin:0 0 16px;font-size:22px;color:#b91c1c;">Installment Payment Overdue</h1>
    <p style="margin:0 0 16px;color:#475569;line-height:1.7;">Dear ${escapeHtml(studentName)},</p>
    <p style="margin:0 0 20px;color:#475569;line-height:1.7;">Your installment payment is overdue. Please pay at the earliest to avoid disruption.</p>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 0;color:#64748b;">Course</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${escapeHtml(courseName)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Due Amount</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${formatInr(dueAmount)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Due Date</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${escapeHtml(dueDate)}</td></tr>
      <tr><td style="padding:10px 0;color:#64748b;">Pending Terms</td><td style="padding:10px 0;font-weight:600;color:#0f172a;">${escapeHtml(terms)}</td></tr>
    </table>
    <p style="margin:24px 0 0;color:#475569;">Thank You.</p>
  </div>
</body>
</html>`;
}

export async function sendInstallmentReminderEmail(params: {
  studentEmail: string;
  studentName: string;
  courseName: string;
  termNo: number;
  amount: number;
  dueDate: string;
}) {
  await sendTransactionalEmail({
    to: params.studentEmail,
    subject: "Installment Due Reminder",
    html: buildInstallmentReminderHtml(params),
    text: `Dear ${params.studentName}, your installment for ${params.courseName} (Term ${params.termNo}) of ${formatInr(params.amount)} is due on ${params.dueDate}.`,
  });
}

export async function sendOverdueInstallmentEmail(params: {
  studentEmail: string;
  studentName: string;
  courseName: string;
  dueAmount: number;
  dueDate: string;
  pendingTerms: number[];
}) {
  await sendTransactionalEmail({
    to: params.studentEmail,
    subject: "Installment Payment Overdue",
    html: buildOverdueInstallmentHtml(params),
    text: `Dear ${params.studentName}, your installment payment for ${params.courseName} is overdue. Due: ${formatInr(params.dueAmount)} on ${params.dueDate}.`,
  });
}
