"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Gift,
  Loader2,
  Copy,
  Share2,
  Users,
  IndianRupee,
  CheckCircle2,
  Clock,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatInr } from "@/lib/enrollment/paymentCalculations";
import { cn } from "@/lib/utils";

type ReferralRow = {
  id: string;
  referralCode: string;
  referredStudentName: string;
  referredStudentId: string;
  referralPercentage: number;
  enrollmentStatus: boolean;
  paymentStatus: string;
  earnedAmount: number;
  courseTitle?: string;
  courseAmount?: number;
  createdAt: string;
};

type WalletRow = {
  id: string;
  type: "credit" | "debit" | "withdrawal";
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
};

type DashboardData = {
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
  availableBalance: number;
  successfulEnrollments: number;
  pendingReferrals: number;
  activeReferralPercentage: number | null;
  referrals: ReferralRow[];
  walletHistory: WalletRow[];
};

export default function StudentReferralsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/referrals", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load referrals");
      setData(json);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const copyCode = async () => {
    if (!data?.referralCode) return;
    try {
      await navigator.clipboard.writeText(data.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const shareCode = async () => {
    if (!data?.referralCode) return;
    const text = `Join SP Art Hub using my referral code: ${data.referralCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SP Art Hub Referral", text });
      } catch {
        /* user cancelled */
      }
    } else {
      await copyCode();
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Referrals"
        subtitle="Share your code, earn rewards when friends enroll"
      />

      {/* Referral Code Card */}
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-200">
              <Gift className="h-5 w-5" />
              <span className="text-sm font-medium">Your Referral Code</span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold tracking-wider">
              {data.referralCode}
            </p>
            {data.activeReferralPercentage !== null && (
              <p className="mt-2 text-sm text-violet-200">
                Active program: {data.activeReferralPercentage}% reward on successful enrollments
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="bg-white/20 text-white hover:bg-white/30 border-0"
              onClick={copyCode}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button
              variant="secondary"
              className="bg-white text-violet-700 hover:bg-violet-50"
              onClick={shareCode}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Referrals", value: data.totalReferrals, icon: Users },
          { label: "Total Earnings", value: formatInr(data.totalEarnings), icon: IndianRupee, isText: true },
          { label: "Successful Enrollments", value: data.successfulEnrollments, icon: CheckCircle2 },
          { label: "Pending Referrals", value: data.pendingReferrals, icon: Clock },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <card.icon className="h-5 w-5 text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Wallet */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Earnings Wallet</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Available Balance</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {formatInr(data.availableBalance)}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">Total Earned</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              {formatInr(data.totalEarnings)}
            </p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="text-sm text-violet-700">Referral Earnings</p>
            <p className="mt-1 text-2xl font-bold text-violet-900">
              {formatInr(data.totalEarnings)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Use your wallet balance as a discount on future enrollments, or contact admin for
          withdrawal requests.
        </p>
      </div>

      {/* Referral History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Referral History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 pr-3 font-medium">Code</th>
                <th className="pb-3 pr-3 font-medium">Referred Student</th>
                <th className="pb-3 pr-3 font-medium">Student ID</th>
                <th className="pb-3 pr-3 font-medium">Discount %</th>
                <th className="pb-3 pr-3 font-medium">Enrollment</th>
                <th className="pb-3 pr-3 font-medium">Payment</th>
                <th className="pb-3 pr-3 font-medium">Earnings</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No referrals yet. Share your code to start earning!
                  </td>
                </tr>
              )}
              {data.referrals.map(r => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-mono text-violet-700">{r.referralCode}</td>
                  <td className="py-3 pr-3">{r.referredStudentName}</td>
                  <td className="py-3 pr-3 text-xs text-slate-500">
                    {r.referredStudentId.slice(-8)}
                  </td>
                  <td className="py-3 pr-3">{r.referralPercentage}%</td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.enrollmentStatus
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {r.enrollmentStatus ? "True" : "False"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 capitalize">{r.paymentStatus}</td>
                  <td className="py-3 pr-3 font-semibold text-emerald-700">
                    {r.enrollmentStatus ? formatInr(r.earnedAmount) : "—"}
                  </td>
                  <td className="py-3 text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Wallet History */}
      {data.walletHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 pr-3 font-medium">Type</th>
                  <th className="pb-3 pr-3 font-medium">Description</th>
                  <th className="pb-3 pr-3 font-medium">Amount</th>
                  <th className="pb-3 pr-3 font-medium">Balance After</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.walletHistory.map(w => (
                  <tr key={w.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 capitalize">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          w.type === "credit"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {w.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3">{w.description}</td>
                    <td
                      className={cn(
                        "py-3 pr-3 font-semibold",
                        w.type === "credit" ? "text-emerald-700" : "text-slate-700",
                      )}
                    >
                      {w.type === "credit" ? "+" : "-"}
                      {formatInr(w.amount)}
                    </td>
                    <td className="py-3 pr-3">{formatInr(w.balanceAfter)}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(w.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
