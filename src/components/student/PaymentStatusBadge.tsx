"use client";

import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
  partially_paid: "bg-blue-100 text-blue-800 border-blue-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  overdue: "bg-red-100 text-red-800 border-red-200",
  failed: "bg-slate-100 text-slate-800 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  partially_paid: "Partially Paid",
  pending: "Pending",
  overdue: "Overdue",
  failed: "Failed",
};

export type StudentPaymentMode = "full" | "partial";

export function getStudentPaymentMode(
  courses: Array<{
    paymentType?: string;
    paymentPlanStatus?: string;
    paymentStatus?: string;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
  }>,
): StudentPaymentMode {
  const isPartial = courses.some(c => {
    if (c.paymentType === "installment") return true;

    const status = (c.paymentPlanStatus ?? c.paymentStatus ?? "").toLowerCase();
    const remaining = c.remainingAmount ?? 0;
    const total = c.totalAmount ?? 0;
    const paid = c.paidAmount ?? 0;

    if (c.paymentType === "full" && (status === "paid" || (total > 0 && paid >= total - 0.01))) {
      return false;
    }

    if (!c.paymentType && (status === "paid" || (total > 0 && paid >= total - 0.01))) {
      return false;
    }

    if (remaining > 0.01) return true;
    return ["partially_paid", "pending", "overdue"].includes(status);
  });
  return isPartial ? "partial" : "full";
}

export function getEnrollmentPaymentMode(
  course: {
    paymentType?: string;
    paymentPlanStatus?: string;
    paymentStatus?: string;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
    installments?: Array<{ paymentStatus?: string }>;
  },
): StudentPaymentMode {
  if (course.installments && course.installments.length > 0) {
    return "partial";
  }
  return getStudentPaymentMode([course]);
}

export function getPaymentModeBreakdown(
  courses: Array<{
    courseTitle?: string;
    paymentType?: string;
    paymentPlanStatus?: string;
    paymentStatus?: string;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
    installments?: Array<{ paymentStatus?: string }>;
  }>,
) {
  const items = courses.map(c => ({
    courseTitle: c.courseTitle ?? "Course",
    mode: getEnrollmentPaymentMode(c),
  }));
  const fullCourses = items.filter(i => i.mode === "full");
  const partialCourses = items.filter(i => i.mode === "partial");
  return {
    fullCount: fullCourses.length,
    partialCount: partialCourses.length,
    fullCourses: fullCourses.map(i => i.courseTitle),
    partialCourses: partialCourses.map(i => i.courseTitle),
    items,
  };
}

export function filterCoursesByPaymentMode<
  T extends {
    paymentType?: string;
    paymentPlanStatus?: string;
    paymentStatus?: string;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
    installments?: Array<{ paymentStatus?: string }>;
  },
>(courses: T[], mode: "all" | StudentPaymentMode): T[] {
  if (mode === "all") return courses;
  return courses.filter(c => getEnrollmentPaymentMode(c) === mode);
}

export function PaymentModeSummary({
  courses,
  showCourseList = true,
  modeFilter = "all",
  className,
}: {
  courses: Array<{
    enrollmentId?: string;
    courseTitle?: string;
    paymentType?: string;
    paymentPlanStatus?: string;
    paymentStatus?: string;
    remainingAmount?: number;
    paidAmount?: number;
    totalAmount?: number;
    installments?: Array<{ paymentStatus?: string }>;
  }>;
  showCourseList?: boolean;
  modeFilter?: "all" | StudentPaymentMode;
  className?: string;
}) {
  const visibleCourses = filterCoursesByPaymentMode(courses, modeFilter);
  const breakdown = getPaymentModeBreakdown(visibleCourses);

  if (breakdown.fullCount === 0 && breakdown.partialCount === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-col gap-2 min-w-[220px]", className)}>
      <div className="flex flex-wrap justify-center gap-1.5 shrink-0">
        {breakdown.fullCount > 0 && (
          <span
            title={breakdown.fullCourses.join(", ")}
            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800"
          >
            {breakdown.fullCount} Full
          </span>
        )}
        {breakdown.partialCount > 0 && (
          <span
            title={breakdown.partialCourses.join(", ")}
            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800"
          >
            {breakdown.partialCount} Partial
          </span>
        )}
      </div>
      {showCourseList && visibleCourses.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
          <div className="border-b border-slate-200 bg-white/80 px-2.5 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Course List ({visibleCourses.length})
            </p>
          </div>
          <div className="max-h-36 overflow-y-auto overscroll-contain scroll-smooth px-2 py-1.5 space-y-1">
            {visibleCourses.map((course, idx) => {
              const item = breakdown.items[idx];
              if (!item) return null;
              return (
                <div
                  key={course.enrollmentId ?? `${item.courseTitle}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-700">
                    {item.courseTitle}
                  </span>
                  <PaymentModeBadge mode={item.mode} compact className="shrink-0 px-2 py-0 text-[10px]" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function PaymentModeBadge({
  mode,
  className,
  compact = false,
}: {
  mode: StudentPaymentMode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        mode === "full"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-amber-100 text-amber-800 border-amber-200",
        className,
      )}
    >
      {compact
        ? mode === "full"
          ? "Full"
          : "Partial"
        : mode === "full"
          ? "Full Payment"
          : "Partial Payment"}
    </span>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status?: string;
  className?: string;
}) {
  const key = (status ?? "pending").toLowerCase().replace(/\s+/g, "_");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[key] ?? STATUS_STYLES.pending,
        className,
      )}
    >
      {STATUS_LABELS[key] ?? status ?? "Pending"}
    </span>
  );
}
