import nodemailer from "nodemailer";

export type MailAttachment = {
  filename: string;
  content: Buffer | string;
  contentType?: string;
};

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: MailAttachment[];
};

export function createMailTransport() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user =
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER;
  const pass =
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendTransactionalEmail(payload: MailPayload): Promise<void> {
  const transport = createMailTransport();
  if (!transport) {
    throw new Error("Email is not configured (set SMTP_USER/SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD)");
  }
  const from =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.GMAIL_USER;
  await transport.sendMail({
    from: `"Little Brushes Studio" <${from}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    attachments: payload.attachments,
  });
}

export function buildTeacherAssignmentEmailHtml(params: {
  teacherName: string;
  batchName: string;
  course: string;
  batchTiming: string;
  startDate: string;
  branch: string;
}): string {
  const { teacherName, batchName, course, batchTiming, startDate, branch } = params;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>New batch assignment</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#ea580c);padding:28px 32px;color:#fff;">
              <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Little Brushes Studio</div>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:700;">You’ve been assigned to a new batch</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;color:#0f172a;line-height:1.6;">Hi <strong>${escapeHtml(
                teacherName,
              )}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                A new batch has been created and you are on the teaching team. Here are the details:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Batch</span><br/><strong style="color:#0f172a;font-size:15px;">${escapeHtml(
                  batchName,
                )}</strong></td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Course</span><br/><strong style="color:#0f172a;font-size:15px;">${escapeHtml(
                  course,
                )}</strong></td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Schedule</span><br/><strong style="color:#0f172a;font-size:15px;">${escapeHtml(
                  batchTiming,
                )}</strong></td></tr>
                <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Start</span><br/><strong style="color:#0f172a;font-size:15px;">${escapeHtml(
                  startDate,
                )}</strong></td></tr>
                <tr><td style="padding:14px 18px;"><span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Branch</span><br/><strong style="color:#0f172a;font-size:15px;">${escapeHtml(
                  branch,
                )}</strong></td></tr>
              </table>
              <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                This is an automated message. Please contact the academy office if anything looks incorrect.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
