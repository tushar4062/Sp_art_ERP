"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Mail,
  User,
  XCircle,
  BookOpen,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthlyAttendanceCalendar } from "@/components/attendance/MonthlyAttendanceCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PreviewData = {
  staff: { userId: string; name: string; email: string; role: string };
  batch: { id: string; name: string; course: string; schedule: string };
  month: string;
  summary: {
    present: number;
    absent: number;
    halfDay: number;
    total: number;
    attendancePercentage: number;
  };
  records: { date: string; status: string; remarks: string }[];
};

export function AdminStaffAttendancePreviewPage({
  previewId,
  staffLabel,
}: {
  previewId: string;
  staffLabel: string;
}) {
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") || "teacher") as "teacher" | "senior-teacher";
  const returnTo =
    searchParams.get("returnTo") ||
    (role === "senior-teacher" ? "/admin/attendance/senior-teacher" : "/admin/attendance/teacher");

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role, month });
      const res = await batchFetch(
        `/api/admin/staff-attendance/preview/${encodeURIComponent(previewId)}?${params}`,
      );
      const json = await parseJsonResponse<{ error?: string; data?: PreviewData }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load report");
      setData(json.data ?? null);
    } catch (e) {
      const msg = messageFromUnknown(e, "Failed to load attendance preview");
      setError(msg);
      setData(null);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [previewId, role, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasRecords = (data?.records.length ?? 0) > 0;

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Attendance report preview"
        subtitle={data ? `${data.staff.name} · ${data.batch.name}` : `Detailed ${staffLabel.toLowerCase()} attendance`}
        action={
          <Button variant="outline" size="sm" className="h-9 rounded-xl" asChild>
            <Link href={returnTo}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to attendance report
            </Link>
          </Button>
        }
      />

      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              {staffLabel} information
            </CardTitle>
            <div className="flex flex-col gap-1.5 sm:items-end">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <Input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="h-9 w-full sm:w-[180px] rounded-xl"
                disabled={loading}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoTile icon={User} label="Name" value={data.staff.name} />
              <InfoTile icon={Mail} label="Email" value={data.staff.email || "—"} />
              <InfoTile icon={Layers} label="Batch" value={data.batch.name} />
              <InfoTile icon={BookOpen} label="Course" value={data.batch.course} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Present"
          value={data?.summary.present ?? 0}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
        />
        <SummaryStat
          label="Absent"
          value={data?.summary.absent ?? 0}
          icon={XCircle}
          tone="red"
          loading={loading}
        />
        <SummaryStat
          label="Attendance %"
          value={data?.summary.attendancePercentage ?? 0}
          suffix="%"
          icon={BarChart3}
          tone="primary"
          loading={loading}
        />
      </div>

      {!loading && !error && !hasRecords ? (
        <Card className="rounded-3xl border border-dashed border-border py-16 text-center shadow-sm">
          <p className="text-muted-foreground font-medium">No attendance data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try selecting a different month or check back after attendance is marked.
          </p>
        </Card>
      ) : (
        <MonthlyAttendanceCalendar month={month} records={data?.records ?? []} loading={loading} />
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground truncate">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate">{value}</span>
      </p>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  suffix = "",
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof BarChart3;
  tone: "emerald" | "red" | "primary";
  loading?: boolean;
}) {
  const tones = {
    emerald: "from-emerald-500/10 border-emerald-200/80",
    red: "from-red-500/10 border-red-200/80",
    primary: "from-primary/10 border-primary/20",
  };
  const iconTones = {
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    primary: "bg-primary/15 text-primary",
  };

  return (
    <Card className={cn("rounded-3xl border bg-gradient-to-br to-background shadow-sm", tones[tone])}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-9 w-16 mt-2" />
          ) : (
            <p className="text-3xl font-display font-bold mt-1">
              {value}
              {suffix}
            </p>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", iconTones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
