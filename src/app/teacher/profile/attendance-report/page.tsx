"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTeacherSessionGuard } from "@/components/teacher/useTeacherSessionGuard";
import { Calendar } from "lucide-react";
import { currentMonthString } from "@/lib/dates/attendanceDate";
import { toast } from "sonner";

type Rec = { attendanceDate: string; status: string; batchId?: string; remarks?: string };

export default function TeacherAttendanceReportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { sessionOk, checking } = useTeacherSessionGuard();
  const [month, setMonth] = useState(() => currentMonthString());
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<Rec[]>([]);
  const [summary, setSummary] = useState<{ present: number; absent: number; total: number; percentage: number } | null>(null);

  const fetchReport = async (m: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/attendance/report?month=${encodeURIComponent(m)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error || "Failed to load report";
        if (res.status === 401) {
          toast.error("Session expired. Please sign in again as Teacher.");
          router.replace("/login");
        } else {
          toast.error(msg);
        }
        throw new Error(msg);
      }
      setRecords(json.records || []);
      setSummary(json.summary || null);
    } catch {
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionOk || checking) return;
    void fetchReport(month);
  }, [month, sessionOk, checking]);

  const daysInMonth = useMemo(() => {
    const [y, mo] = month.split("-").map(Number);
    const days = new Date(y, mo, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [month]);

  const recordMap = useMemo(() => {
    const map: Record<string, Rec> = {};
    records.forEach(r => (map[r.attendanceDate] = r));
    return map;
  }, [records]);

  const statusClass = (s?: string) => {
    if (!s) return "border border-slate-200";
    if (s === "Present") return "bg-emerald-600 text-white";
    if (s === "Absent") return "bg-rose-600 text-white";
    return "bg-slate-300 text-slate-800";
  };

  if (checking || !sessionOk) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Verifying teacher session…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Report</h1>
          <p className="text-sm text-muted-foreground">{user?.name || user?.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-xl" />
          <Button variant="ghost" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">Total Records: {summary?.total ?? 0}</div>
              <div className="text-sm">Present: {summary?.present ?? 0}</div>
              <div className="text-sm">Absent: {summary?.absent ?? 0}</div>
              <div className="text-sm">Attendance: {summary?.percentage ?? 0}%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              <Calendar className="inline-block mr-2" /> Month View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-3">
              {daysInMonth.map(d => {
                const day = String(d).padStart(2, "0");
                const [y, mo] = month.split("-");
                const dateKey = `${y}-${mo}-${day}`;
                const rec = recordMap[dateKey];
                return (
                  <div key={dateKey} className={`h-20 rounded-lg p-2 flex flex-col justify-between ${statusClass(rec?.status)}`}>
                    <div className="text-xs">{d}</div>
                    <div className="text-sm font-semibold">{rec ? (rec.status === "Present" ? "P" : "A") : "-"}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
