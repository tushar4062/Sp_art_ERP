export const GST_RATE = 0.18;
export const INSTALLMENT_SURCHARGE_RATE = 0.2;

export type PaymentType = "full" | "installment";

export type PaymentPlanStatus = "paid" | "partially_paid" | "pending" | "overdue" | "failed";

export type InstallmentTermStatus = "pending" | "paid" | "overdue" | "failed";

export type PaymentBreakdown = {
  baseAmount: number;
  gstAmount: number;
  subtotalWithGst: number;
  installmentCharge: number;
  totalAmount: number;
  paymentType: PaymentType;
  termCount: number;
  termAmounts: number[];
  dueDates: string[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Map course duration (months) to installment term count and month gaps. */
export function getInstallmentPlan(durationMonths: number) {
  const duration = Math.max(1, Math.round(durationMonths));
  if (duration >= 6) {
    return { termCount: 3, gaps: [0, 2, 4] as const };
  }
  if (duration === 4) {
    return { termCount: 2, gaps: [0, 2] as const };
  }
  return { termCount: 2, gaps: [0, 1] as const };
}

export function calculatePaymentBreakdown(
  baseAmount: number,
  durationMonths: number,
  paymentType: PaymentType,
  enrollmentDate: Date = new Date(),
): PaymentBreakdown {
  const base = round2(Math.max(0, baseAmount));
  const gstAmount = round2(base * GST_RATE);
  const subtotalWithGst = round2(base + gstAmount);
  const installmentCharge =
    paymentType === "installment" ? round2(subtotalWithGst * INSTALLMENT_SURCHARGE_RATE) : 0;
  const totalAmount = round2(subtotalWithGst + installmentCharge);

  const plan = getInstallmentPlan(durationMonths);
  const termCount = paymentType === "full" ? 1 : plan.termCount;

  const termAmounts: number[] = [];
  if (paymentType === "full") {
    termAmounts.push(totalAmount);
  } else {
    const perTerm = round2(totalAmount / plan.termCount);
    let allocated = 0;
    for (let i = 0; i < plan.termCount; i++) {
      if (i === plan.termCount - 1) {
        termAmounts.push(round2(totalAmount - allocated));
      } else {
        termAmounts.push(perTerm);
        allocated += perTerm;
      }
    }
  }

  const dueDates =
    paymentType === "full"
      ? [toDateKey(enrollmentDate)]
      : plan.gaps.map(g => toDateKey(addMonths(enrollmentDate, g)));

  return {
    baseAmount: base,
    gstAmount,
    subtotalWithGst,
    installmentCharge,
    totalAmount,
    paymentType,
    termCount,
    termAmounts,
    dueDates,
  };
}

export function derivePaymentPlanStatus(
  paidAmount: number,
  totalAmount: number,
  hasOverdue: boolean,
  hasFailed: boolean,
): PaymentPlanStatus {
  if (hasFailed) return "failed";
  if (paidAmount >= totalAmount - 0.01) return "paid";
  if (hasOverdue) return "overdue";
  if (paidAmount > 0) return "partially_paid";
  return "pending";
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
