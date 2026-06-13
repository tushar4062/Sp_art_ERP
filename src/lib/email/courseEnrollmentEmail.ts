import { generateEnrollmentInvoicePdf, EnrollmentInvoiceData } from '@/lib/invoice';
import { sendTransactionalEmail } from '@/lib/email/mailer';

export function buildCourseEnrollmentEmailHtml(params: {
  studentName: string;
  courseTitle: string;
  courseCode: string;
  enrollmentDate: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  invoiceId: string;
  supportEmail: string;
  supportPhone: string;
  discountPercentage: number;
  discountAmount: number;
}): string {
  const {
    studentName,
    courseTitle,
    courseCode,
    enrollmentDate,
    amountPaid,
    paymentMethod,
    transactionId,
    orderId,
    invoiceId,
    supportEmail,
    supportPhone,
    discountPercentage,
    discountAmount,
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Course Enrollment Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:#1d4ed8;padding:28px 32px;color:#ffffff;text-align:left;">
              <h1 style="margin:0;font-size:28px;line-height:1.1;font-weight:800;">Course Enrollment Confirmed</h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.7;opacity:0.9;">Hi ${escapeHtml(studentName)}, thank you for enrolling with Little Brushes Art Academy.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.8;">Your course enrollment is confirmed and your invoice is attached for your records. Below are the most important details:</p>
              <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                ${buildDetailRow('Course', courseTitle)}
                ${buildDetailRow('Course Code', courseCode)}
                ${buildDetailRow('Discount', `${discountPercentage}% (${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`)}
                ${buildDetailRow('Enrollment Date', enrollmentDate)}
                ${buildDetailRow('Amount Paid', `₹${amountPaid.toLocaleString('en-IN')}`)}
                ${buildDetailRow('Payment Method', paymentMethod)}
                ${buildDetailRow('Transaction ID', transactionId)}
                ${buildDetailRow('Order ID', orderId)}
              </table>
              <div style="margin:30px 0 0;padding:22px;border-radius:18px;background:#f8fafc;border:1px solid #e2e8f0;">
                <p style="margin:0;font-size:15px;color:#0f172a;font-weight:700;">Invoice ID: ${invoiceId}</p>
                <p style="margin:8px 0 0;font-size:14px;color:#64748b;line-height:1.8;">Please keep this email for your records. If you have any questions, our support team is happy to help.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:24px 32px;color:#475569;font-size:13px;line-height:1.8;">
              <p style="margin:0 0 4px;color:#0f172a;font-weight:700;">Support</p>
              <p style="margin:0;">Email: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(supportEmail)}</a></p>
              <p style="margin:8px 0 0;">Phone: <a href="${phoneTelHref(supportPhone)}" style="color:#1d4ed8;text-decoration:underline;">${escapeHtml(supportPhone)}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function buildDetailRow(label: string, value: string) {
  return `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#64748b;width:30%;">${escapeHtml(label)}</td>
  <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">${escapeHtml(value)}</td>
</tr>
`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function phoneTelHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `tel:+${normalized}`;
}

export async function sendCourseEnrollmentEmail(params: {
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  courseCode: string;
  enrollmentDate: string;
  amountPaid: number;
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  invoiceId: string;
  supportEmail: string;
  supportPhone: string;
  courseDurationMonths: number;
  discountPercentage: number;
  discountAmount: number;
  gstNumber?: string;
  baseAmount?: number;
  gstAmount?: number;
  installmentCharge?: number;
  termNo?: number;
  paymentType?: 'full' | 'installment';
}): Promise<void> {
  const {
    studentEmail,
    studentName,
    courseTitle,
    courseCode,
    enrollmentDate,
    amountPaid,
    paymentMethod,
    transactionId,
    orderId,
    invoiceId,
    supportEmail,
    supportPhone,
    courseDurationMonths,
    discountPercentage,
    discountAmount,
    gstNumber,
    baseAmount,
    gstAmount,
    installmentCharge,
    termNo,
    paymentType,
  } = params;

  const invoiceData: EnrollmentInvoiceData = {
    invoiceId,
    academyName: 'Little Brushes Art Academy',
    studentName,
    studentEmail,
    courseTitle,
    courseCode,
    courseDurationMonths,
    amountPaid,
    discountPercentage,
    discountAmount,
    paymentMethod,
    transactionId,
    orderId,
    purchaseDate: enrollmentDate,
    taxAmount: params.gstAmount ?? 0,
    baseAmount: params.baseAmount,
    installmentCharge: params.installmentCharge,
    paymentType: params.paymentType,
    termNo: params.termNo,
    supportEmail,
    supportPhone,
    gstNumber,
  };

  const pdfBuffer = await generateEnrollmentInvoicePdf(invoiceData);
  const html = buildCourseEnrollmentEmailHtml({
    studentName,
    courseTitle,
    courseCode,
    enrollmentDate,
    amountPaid,
    paymentMethod,
    transactionId,
    orderId,
    supportEmail,
    supportPhone,
    invoiceId,
    discountPercentage,
    discountAmount,
  });

  await sendTransactionalEmail({
    to: studentEmail,
    subject: 'Course Enrollment Confirmation & Invoice',
    html,
    text: `Hi ${studentName}, your enrollment for ${courseTitle} is confirmed. Invoice ID: ${invoiceId}.`,
    attachments: [
      {
        filename: `invoice-${courseCode}-${studentName.replace(/\s+/g, '-')}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
