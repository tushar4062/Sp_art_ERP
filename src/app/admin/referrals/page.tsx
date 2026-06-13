"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Gift,
  Loader2,
  Users,
  IndianRupee,
  TrendingUp,
  CheckCircle2,
  Clock,
  Search,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatInr } from "@/lib/enrollment/paymentCalculations";
import { cn } from "@/lib/utils";

type ReferralSetting = {
  id: string;
  percentage: number;
  status: "active" | "inactive";
  updatedAt: string;
};

type ReferralTransaction = {
  id: string;
  referralCode: string;
  referrerName: string;
  referredStudentName: string;
  referredStudentId: string;
  referralPercentage: number;
  enrollmentStatus: boolean;
  paymentStatus: string;
  earnedAmount: number;
  courseAmount: number;
  courseTitle?: string;
  createdAt: string;
};

type TopReferrer = {
  studentId: string;
  studentName: string;
  referralCode: string;
  totalReferrals: number;
  totalEarnings: number;
};

type ReportData = {
  settings: ReferralSetting[];
  activePercentage: number | null;
  stats: {
    totalReferrals: number;
    successfulEnrollments: number;
    pendingReferrals: number;
    totalEarningsDistributed: number;
    referralRevenue: number;
  };
  topReferrers: TopReferrer[];
  transactions: ReferralTransaction[];
  allowedPercentages: number[];
};

export default function AdminReferralsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPercentage, setSelectedPercentage] = useState<number>(10);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "inactive">("active");
  const [editMode, setEditMode] = useState(false);

  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "pending">("all");
  const [filterCode, setFilterCode] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCode.trim()) params.set("referralCode", filterCode.trim());
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(`/api/admin/referrals?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load referrals");

      setData(json);
      if (json.activePercentage) {
        setSelectedPercentage(json.activePercentage);
        setSelectedStatus("active");
      } else if (json.settings?.length) {
        setSelectedPercentage(json.settings[0].percentage);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCode, filterFrom, filterTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          percentage: selectedPercentage,
          status: selectedStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save settings");

      toast({
        title: "Settings Saved",
        description: `Referral program set to ${selectedPercentage}% (${selectedStatus})`,
      });
      setEditMode(false);
      await fetchReport();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Could not save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Referral Management"
        subtitle="Configure student referral rewards and monitor program performance"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Referrals", value: stats?.totalReferrals ?? 0, icon: Users, color: "blue" },
          {
            label: "Successful Enrollments",
            value: stats?.successfulEnrollments ?? 0,
            icon: CheckCircle2,
            color: "emerald",
          },
          {
            label: "Pending Referrals",
            value: stats?.pendingReferrals ?? 0,
            icon: Clock,
            color: "amber",
          },
          {
            label: "Earnings Distributed",
            value: formatInr(stats?.totalEarningsDistributed ?? 0),
            icon: IndianRupee,
            color: "violet",
            isText: true,
          },
          {
            label: "Referral Revenue",
            value: formatInr(stats?.referralRevenue ?? 0),
            icon: TrendingUp,
            color: "indigo",
            isText: true,
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{card.label}</p>
              <card.icon className={cn("h-5 w-5", `text-${card.color}-600`)} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {card.isText ? card.value : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">Referral Settings</h2>
          </div>
          {!editMode ? (
            <Button variant="outline" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Only one percentage can be active at a time. Earnings = Course Fee × Active Percentage.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.allowedPercentages ?? [5, 10, 15, 20]).map(pct => {
            const setting = data?.settings.find(s => s.percentage === pct);
            const isActive = setting?.status === "active";
            const isSelected = selectedPercentage === pct;

            return (
              <button
                key={pct}
                type="button"
                disabled={!editMode}
                onClick={() => setSelectedPercentage(pct)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  isSelected && editMode
                    ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                    : "border-slate-200",
                  !editMode && isActive && "border-emerald-400 bg-emerald-50",
                  editMode && "hover:border-violet-300 cursor-pointer",
                  !editMode && "cursor-default",
                )}
              >
                <p className="text-2xl font-bold text-slate-900">{pct}%</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isActive ? "Currently Active" : "Inactive"}
                </p>
              </button>
            );
          })}
        </div>

        {editMode && (
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={v => setSelectedStatus(v as "active" | "inactive")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-slate-500">
              Example: ₹20,000 course × {selectedPercentage}% ={" "}
              <strong>{formatInr(20000 * (selectedPercentage / 100))}</strong> reward
            </p>
          </div>
        )}
      </div>

      {/* Top Referrers */}
      {data?.topReferrers && data.topReferrers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Top Referrers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Student</th>
                  <th className="pb-3 pr-4 font-medium">Referral Code</th>
                  <th className="pb-3 pr-4 font-medium">Referrals</th>
                  <th className="pb-3 font-medium">Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {data.topReferrers.map(r => (
                  <tr key={r.studentId} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-medium text-slate-900">{r.studentName}</td>
                    <td className="py-3 pr-4 font-mono text-violet-700">{r.referralCode}</td>
                    <td className="py-3 pr-4">{r.totalReferrals}</td>
                    <td className="py-3 font-semibold text-emerald-700">
                      {formatInr(r.totalEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters + Transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Referral Transactions</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Referral Code</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={filterCode}
                  onChange={e => setFilterCode(e.target.value.toUpperCase())}
                  placeholder="SPARTRF-0001"
                  className="w-40 pl-8 uppercase"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={v => setFilterStatus(v as typeof filterStatus)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Enrolled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="w-36"
              />
            </div>
            <Button variant="outline" onClick={fetchReport} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Filter className="mr-1 h-4 w-4" />
                  Apply
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 pr-3 font-medium">Code</th>
                <th className="pb-3 pr-3 font-medium">Referrer</th>
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
              {data?.transactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No referral transactions found
                  </td>
                </tr>
              )}
              {data?.transactions.map(t => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-3 pr-3 font-mono text-violet-700">{t.referralCode}</td>
                  <td className="py-3 pr-3">{t.referrerName}</td>
                  <td className="py-3 pr-3">{t.referredStudentName}</td>
                  <td className="py-3 pr-3 text-xs text-slate-500">
                    {t.referredStudentId.slice(-8)}
                  </td>
                  <td className="py-3 pr-3">{t.referralPercentage}%</td>
                  <td className="py-3 pr-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        t.enrollmentStatus
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {t.enrollmentStatus ? "True" : "False"}
                    </span>
                  </td>
                  <td className="py-3 pr-3 capitalize">{t.paymentStatus}</td>
                  <td className="py-3 pr-3 font-semibold text-emerald-700">
                    {t.enrollmentStatus ? formatInr(t.earnedAmount) : "—"}
                  </td>
                  <td className="py-3 text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
