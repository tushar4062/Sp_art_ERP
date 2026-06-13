import PDFDocument from 'pdfkit';

export interface EnrollmentInvoiceData {
  invoiceId: string;
  academyName: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseCode: string;
  courseDurationMonths: number;
  baseAmount?: number;
  amountPaid: number;
  discountPercentage: number;
  discountAmount: number;
  paymentMethod: string;
  transactionId: string;
  orderId: string;
  purchaseDate: string;
  taxAmount: number;
  installmentCharge?: number;
  paymentType?: 'full' | 'installment';
  termNo?: number;
  supportEmail: string;
  supportPhone: string;
  gstNumber?: string;
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function clampLength(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

export async function generateEnrollmentInvoicePdf(data: EnrollmentInvoiceData): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fillColor('#0f172a');

  // Header
  doc.rect(40, 40, 515, 120).fill('#eff6ff');
  doc.fill('#1d4ed8').font('Helvetica-Bold').fontSize(18).text(data.academyName, 56, 56);
  doc.fill('#0f172a').font('Helvetica').fontSize(10).text('Professional Art Education | Student Finance Invoice', 56, 80);
  doc.fontSize(10).fillColor('#475569').text(`Invoice ID: ${data.invoiceId}`, 56, 100);
  doc.text(`Purchase Date: ${data.purchaseDate}`, 56, 114);

  doc.fillColor('#0f172a').font('Helvetica').fontSize(10).text('Billing To:', 330, 56);
  doc.font('Helvetica-Bold').fontSize(12).text(data.studentName, 330, 72);
  doc.font('Helvetica').fontSize(10).fillColor('#475569').text(data.studentEmail, 330, 88);
  doc.font('Helvetica').text(data.supportPhone ? `Support: ${data.supportPhone}` : '', 330, 108);

  doc.moveDown(2);
  doc.moveTo(40, 170).lineTo(555, 170).stroke('#cbd5e1');

  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Invoice Summary', 40, 182);
  doc.font('Helvetica').fontSize(10).fillColor('#475569');
  const summaryTop = 204;
  const summaryGap = 18;

  const summaryItems = [
    ['Course Name', data.courseTitle],
    ['Course Code', data.courseCode],
    ['Duration', `${data.courseDurationMonths} month${data.courseDurationMonths !== 1 ? 's' : ''}`],
    ...(data.baseAmount != null ? [['Base Amount', formatCurrency(data.baseAmount)] as [string, string]] : []),
    ['GST (18%)', formatCurrency(data.taxAmount)],
    ...(data.installmentCharge
      ? [['Installment Charges', formatCurrency(data.installmentCharge)] as [string, string]]
      : []),
    ...(data.paymentType === 'installment' && data.termNo
      ? [['Installment Term', `Term ${data.termNo}`] as [string, string]]
      : []),
    ['Amount Paid', formatCurrency(data.amountPaid)],
    ['Discount', `${data.discountPercentage}% (${formatCurrency(data.discountAmount)})`],
    ['Payment Method', data.paymentMethod],
    ['Payment ID', data.transactionId],
    ['Invoice Number', data.invoiceId],
    ['Order ID', data.orderId],
  ];

  summaryItems.forEach(([label, value], index) => {
    const y = summaryTop + index * summaryGap;
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(label, 40, y);
    doc.font('Helvetica-Bold').fillColor('#0f172a').text(value, 180, y, { width: 360, align: 'right' });
  });

  const totalY = summaryTop + summaryItems.length * summaryGap + 18;
  doc.rect(40, totalY - 6, 515, 34).fill('#e0f2fe');
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text('Total Paid', 46, totalY + 2);
  doc.font('Helvetica').fontSize(11).text(formatCurrency(data.amountPaid), 460, totalY + 2, { align: 'right' });

  doc.moveTo(40, totalY + 52).lineTo(555, totalY + 52).stroke('#cbd5e1');

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Need help?', 40, totalY + 70);
  doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`If you have questions about this invoice or your course, contact us at`, 40, totalY + 86, { width: 360 });
  doc.text(`Email: ${data.supportEmail}`, 40, totalY + 102);
  if (data.supportPhone) {
    doc.text(`Phone: ${data.supportPhone}`, 40, totalY + 116);
  }

  if (data.gstNumber) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('GST Number:', 330, totalY + 86);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(data.gstNumber, 410, totalY + 86);
  }

  doc.end();
  return endPromise;
}
