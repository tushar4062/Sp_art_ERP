"use client";

import { useState } from "react";
import { IndianRupee, Calendar, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/components/student/PaymentStatusBadge";
import { EnrollmentPaymentModal } from "@/components/student/EnrollmentPaymentModal";
import { formatInr } from "@/lib/enrollment/paymentCalculations";

type Installment = {
  termNo: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paymentStatus: string;
};

type PaymentRecord = {
  paymentDate: string;
  paymentId: string;
  amount: number;
  termNo: number;
  status: string;
};

type PaymentSummaryCardProps = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  baseFee: number;
  duration: number;
  paymentType: string;
  totalAmount: number;
  gstAmount: number;
  installmentCharge: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPlanStatus?: string;
  nextDueDate?: string | null;
  nextTermNo?: number | null;
  installments?: Installment[];
  paymentHistory?: PaymentRecord[];
  onPaymentSuccess?: () => void;
};

export function PaymentSummaryCard({
  enrollmentId,
  courseId,
  courseTitle,
  baseFee,
  duration,
  paymentType,
  totalAmount,
  gstAmount,
  installmentCharge,
  paidAmount,
  remainingAmount,
  paymentPlanStatus,
  nextDueDate,
  nextTermNo,
  installments = [],
  paymentHistory = [],
  onPaymentSuccess,
}: PaymentSummaryCardProps) {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const canPayNext =
    paymentType === "installment" &&
    remainingAmount > 0 &&
    nextTermNo != null;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">Payment Summary</span>
          </div>
          <PaymentStatusBadge status={paymentPlanStatus} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100">
            <p className="text-slate-500">Total Amount</p>
            <p className="font-bold text-slate-900">{formatInr(totalAmount)}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100">
            <p className="text-slate-500">GST (18%)</p>
            <p className="font-bold text-slate-900">{formatInr(gstAmount)}</p>
          </div>
          {installmentCharge > 0 && (
            <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100">
              <p className="text-slate-500">Installment Charges</p>
              <p className="font-bold text-slate-900">{formatInr(installmentCharge)}</p>
            </div>
          )}
          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100">
            <p className="text-slate-500">Paid Amount</p>
            <p className="font-bold text-emerald-700">{formatInr(paidAmount)}</p>
          </div>
          <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100">
            <p className="text-slate-500">Remaining</p>
            <p className="font-bold text-amber-700">{formatInr(remainingAmount)}</p>
          </div>
          {nextDueDate && (
            <div className="rounded-lg bg-white/80 p-2.5 border border-slate-100 col-span-2">
              <p className="text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Next Due Date
              </p>
              <p className="font-bold text-slate-900">
                {new Date(nextDueDate).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
                {nextTermNo ? ` · Term ${nextTermNo}` : ""}
              </p>
            </div>
          )}
        </div>

        {installments.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700">Installment Schedule</p>
            {installments.map(inst => (
              <div
                key={inst.termNo}
                className="flex items-center justify-between text-xs rounded-lg bg-white/70 px-2.5 py-1.5 border border-slate-100"
              >
                <span>Term {inst.termNo}</span>
                <span className="font-medium">{formatInr(inst.amount)}</span>
                <PaymentStatusBadge status={inst.paymentStatus} />
              </div>
            ))}
          </div>
        )}

        {paymentHistory.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <History className="h-3 w-3" /> Payment History
            </p>
            {paymentHistory.slice(0, 3).map((p, idx) => (
              <div
                key={`${p.paymentId}-${idx}`}
                className="text-[11px] rounded-lg bg-white/70 px-2.5 py-1.5 border border-slate-100 text-slate-600"
              >
                <div className="flex justify-between">
                  <span>
                    {new Date(p.paymentDate).toLocaleDateString("en-IN")} · Term {p.termNo}
                  </span>
                  <span className="font-semibold text-slate-900">{formatInr(p.amount)}</span>
                </div>
                <div className="truncate text-slate-400">ID: {p.paymentId}</div>
              </div>
            ))}
          </div>
        )}

        {canPayNext && (
          <Button
            size="sm"
            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600"
            onClick={() => setPayModalOpen(true)}
          >
            Pay Next Installment
          </Button>
        )}
      </div>

      {canPayNext && (
        <EnrollmentPaymentModal
          open={payModalOpen}
          onOpenChange={setPayModalOpen}
          courseId={courseId}
          courseTitle={courseTitle}
          baseFee={baseFee}
          duration={duration}
          enrollmentId={enrollmentId}
          termNo={nextTermNo!}
          onSuccess={onPaymentSuccess}
        />
      )}
    </>
  );
}
