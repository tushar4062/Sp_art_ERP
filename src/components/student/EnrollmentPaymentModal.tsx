"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, CalendarClock, Gift, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  calculatePaymentBreakdown,
  formatInr,
  type PaymentType,
} from "@/lib/enrollment/paymentCalculations";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpayScript() {
  if (typeof window === "undefined") throw new Error("No window");
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay script failed to load"));
    document.body.appendChild(script);
  });
}

type EnrollmentPaymentModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  baseFee: number;
  duration: number;
  enrollmentId?: string;
  termNo?: number;
  onSuccess?: () => void;
};

export function EnrollmentPaymentModal({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  baseFee,
  duration,
  enrollmentId,
  termNo = 1,
  onSuccess,
}: EnrollmentPaymentModalProps) {
  const isSubsequentPay = Boolean(enrollmentId);
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [loading, setLoading] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    referrerName: string;
    percentage: number;
  } | null>(null);
  const [referralLoading, setReferralLoading] = useState(false);

  const fullBreakdown = calculatePaymentBreakdown(baseFee, duration, "full");
  const installmentBreakdown = calculatePaymentBreakdown(baseFee, duration, "installment");
  const activeBreakdown = isSubsequentPay
    ? installmentBreakdown
    : paymentType === "full"
      ? fullBreakdown
      : installmentBreakdown;

  const payAmount = isSubsequentPay
    ? installmentBreakdown.termAmounts[termNo - 1] ?? installmentBreakdown.termAmounts[0]
    : paymentType === "full"
      ? fullBreakdown.totalAmount
      : installmentBreakdown.termAmounts[0];

  const handleApplyReferral = async () => {
    const code = referralInput.trim();
    if (!code) {
      toast({ title: "Enter referral code", variant: "destructive" });
      return;
    }
    setReferralLoading(true);
    try {
      const res = await fetch("/api/student/referrals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referralCode: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedReferral(null);
        toast({
          title: "Invalid Referral Code",
          description: data.error || "Referral code could not be applied",
          variant: "destructive",
        });
        return;
      }
      setAppliedReferral({
        code: data.referralCode,
        referrerName: data.referrerName,
        percentage: data.referralPercentage,
      });
      toast({ title: "Referral Applied Successfully", description: `Referrer: ${data.referrerName}` });
    } catch {
      toast({ title: "Error", description: "Failed to validate referral code", variant: "destructive" });
    } finally {
      setReferralLoading(false);
    }
  };

  const handlePay = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      let referralForOrder = appliedReferral;

      if (!isSubsequentPay && !referralForOrder && referralInput.trim()) {
        const valRes = await fetch("/api/student/referrals/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ referralCode: referralInput.trim() }),
        });
        const valData = await valRes.json();
        if (valRes.ok && valData.valid) {
          referralForOrder = {
            code: valData.referralCode,
            referrerName: valData.referrerName,
            percentage: valData.referralPercentage,
          };
          setAppliedReferral(referralForOrder);
        }
      }

      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          courseId,
          paymentType: isSubsequentPay ? "installment" : paymentType,
          termNo: isSubsequentPay ? termNo : 1,
          enrollmentId,
          ...(referralForOrder && !isSubsequentPay ? { referralCode: referralForOrder.code } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Payment Error",
          description: data.error || "Failed to create payment order",
          variant: "destructive",
        });
        return;
      }

      const razorpayKeyId = data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
      if (!data.order?.id || !razorpayKeyId) {
        toast({
          title: "Payment Error",
          description: "Payment gateway key is missing.",
          variant: "destructive",
        });
        return;
      }

      await loadRazorpayScript();

      const payContext = {
        amount: data.amount as number,
        enrollmentIdFromOrder: data.enrollmentId as string | undefined,
        prefill: data.prefill as { name?: string; email?: string; contact?: string } | undefined,
        referralCode: referralForOrder?.code,
      };

      // Close our modal before Razorpay opens so the dialog overlay does not block
      // taps on the checkout mobile/contact field (common on phones).
      onOpenChange(false);
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 200));
      });

      const options = {
        key: razorpayKeyId,
        amount: data.order.amount,
        currency: data.order.currency || "INR",
        name: "Little Brushes Art Academy",
        description: courseTitle,
        image: "/logo.png",
        order_id: data.order.id,
        prefill: {
          name: payContext.prefill?.name ?? "",
          email: payContext.prefill?.email ?? "",
          contact: payContext.prefill?.contact ?? "",
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: payContext.amount,
                courseId,
                paymentType: isSubsequentPay ? "installment" : paymentType,
                termNo: isSubsequentPay ? termNo : 1,
                enrollmentId: payContext.enrollmentIdFromOrder || enrollmentId,
                ...(payContext.referralCode && !isSubsequentPay
                  ? { referralCode: payContext.referralCode }
                  : {}),
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              toast({
                title: "Payment Verify Failed",
                description: verifyData.error || "Verification failed",
                variant: "destructive",
              });
              return;
            }
            toast({
              title: "Payment Successful",
              description: isSubsequentPay
                ? "Installment paid successfully"
                : "Enrolled successfully",
            });
            onSuccess?.();
          } catch {
            toast({
              title: "Error",
              description: "Payment verification error",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
          escape: true,
          backdropclose: true,
        },
      };

      const rzp = new window.Razorpay!(options);
      rzp.open();
    } catch {
      toast({
        title: "Error",
        description: "An error occurred during payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    courseId,
    courseTitle,
    enrollmentId,
    isSubsequentPay,
    onOpenChange,
    onSuccess,
    paymentType,
    termNo,
    appliedReferral,
    referralInput,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-2xl border-slate-200 p-0">
        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-xl font-bold text-white">
              {isSubsequentPay ? `Pay Term ${termNo}` : "Complete Enrollment"}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              {courseTitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-5 px-6 py-5">
          {!isSubsequentPay && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("full")}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  paymentType === "full"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-slate-200 hover:border-slate-300",
                )}
              >
                <CreditCard className="mb-2 h-5 w-5 text-blue-600" />
                <p className="font-semibold text-slate-900">Full Payment</p>
                <p className="mt-1 text-xs text-slate-500">Pay entire course fee + GST</p>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("installment")}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  paymentType === "installment"
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-slate-200 hover:border-slate-300",
                )}
              >
                <CalendarClock className="mb-2 h-5 w-5 text-indigo-600" />
                <p className="font-semibold text-slate-900">Installment</p>
                <p className="mt-1 text-xs text-slate-500">Split across terms (+20% charge)</p>
              </button>
            </div>
          )}

          {!isSubsequentPay && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-violet-600" />
                <p className="text-sm font-semibold text-slate-900">Do you have a Referral Code?</p>
              </div>
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={e => {
                    setReferralInput(e.target.value.toUpperCase());
                    setAppliedReferral(null);
                  }}
                  placeholder="e.g. SPARTRF-0001"
                  className="uppercase bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyReferral}
                  disabled={referralLoading || !referralInput.trim()}
                  className="shrink-0"
                >
                  {referralLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {appliedReferral && (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Valid Referral Found</p>
                    <p>{appliedReferral.referrerName} · {appliedReferral.percentage}% program active</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Base Amount</span>
              <span>{formatInr(activeBreakdown.baseAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST (18%)</span>
              <span>{formatInr(activeBreakdown.gstAmount)}</span>
            </div>
            {activeBreakdown.installmentCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Installment Charges (20%)</span>
                <span>{formatInr(activeBreakdown.installmentCharge)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-slate-900">
              <span>{isSubsequentPay ? `Term ${termNo} Payable` : "Total Payable"}</span>
              <span>{formatInr(payAmount)}</span>
            </div>
            {!isSubsequentPay && paymentType === "installment" && (
              <p className="text-xs text-slate-500 pt-1">
                {activeBreakdown.termCount} terms · First payment now · Remaining from My Courses
              </p>
            )}
          </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatInr(payAmount)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
