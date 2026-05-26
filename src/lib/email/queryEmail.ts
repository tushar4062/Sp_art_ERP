import { sendTransactionalEmail } from "@/lib/email/mailer";
import { getAdminNotifyEmails } from "@/lib/leave/leaveEmail";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function queryDetailsHtml(fields: {
  studentName: string;
  studentEmail: string;
  remarks: string;
  status: string;
  adminRemark?: string;
}) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;margin:16px 0;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Student</strong><br/>${escapeHtml(fields.studentName)}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Email</strong><br/>${escapeHtml(fields.studentEmail)}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;"><strong>Query / Remarks</strong><br/>${escapeHtml(fields.remarks)}</td></tr>
      <tr><td style="padding:12px 16px;"><strong>Status</strong><br/>${escapeHtml(fields.status)}</td></tr>
      ${fields.adminRemark ? `<tr><td style="padding:12px 16px;border-top:1px solid #e2e8f0;"><strong>Admin remark</strong><br/>${escapeHtml(fields.adminRemark)}</td></tr>` : ""}
    </table>
  `;
}

function wrapEmail(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:Segoe UI,sans-serif;background:#f4f6fb;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
      <h2 style="color:#ea580c;margin:0 0 16px;">${escapeHtml(title)}</h2>
      ${body}
      <p style="color:#64748b;font-size:13px;margin-top:24px;">Little Brushes Art Academy ERP</p>
    </div>
  </body></html>`;
}

export async function sendNewStudentQueryEmails(fields: {
  studentName: string;
  studentEmail: string;
  remarks: string;
}): Promise<string[]> {
  const warnings: string[] = [];
  const recipients = getAdminNotifyEmails();
  if (!recipients.length) {
    warnings.push("No admin notify email configured");
    return warnings;
  }

  const html = wrapEmail(
    "New Student Query Request",
    `<p>A student has submitted a new profile edit query.</p>${queryDetailsHtml({
      ...fields,
      status: "Pending",
    })}`,
  );
  const text = `New student query from ${fields.studentName} (${fields.studentEmail}). Remarks: ${fields.remarks}. Status: Pending`;

  for (const to of recipients) {
    try {
      await sendTransactionalEmail({ to, subject: "New Student Query Request", html, text });
    } catch (e) {
      console.error("[query email admin]", to, e);
      warnings.push(to);
    }
  }
  return warnings;
}

export async function sendStudentQueryStatusEmail(
  to: string,
  fields: {
    studentName: string;
    studentEmail: string;
    remarks: string;
    status: string;
    adminRemark?: string;
  },
  approved: boolean,
): Promise<void> {
  const subject = approved
    ? "Your Query Has Been Approved"
    : "Your Query Has Been Rejected";

  const html = wrapEmail(
    subject,
    `<p>Hello ${escapeHtml(fields.studentName)},</p>
     <p>Your profile edit query has been <strong>${approved ? "approved" : "rejected"}</strong>.</p>
     ${queryDetailsHtml(fields)}`,
  );
  const text = `${subject}. Query: ${fields.remarks}. Status: ${fields.status}. Admin remark: ${fields.adminRemark || "—"}`;

  await sendTransactionalEmail({ to, subject, html, text });
}
