"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentAttendanceRecord {
  date: string;
  status: "Present" | "Absent";
}

interface StudentAttendanceData {
  batchId: string;
  batchName: string;
  courseName: string;
  studentName: string;
  studentEmail: string;
  attendanceRecords: StudentAttendanceRecord[];
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function StudentAttendancePreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const studentId = Array.isArray(params?.studentId) ? params?.studentId[0] : params?.studentId;
  const batchId = searchParams.get("batchId") || "";
  const [data, setData] = useState<StudentAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(() => new Date());

  useEffect(() => {
    if (!studentId || !batchId) return;

    const fetchStudentAttendance = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({ batchId });
        const response = await fetch(`/api/teacher/attendance/student/${studentId}?${query.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Unable to load student attendance.");
        }

        const payload = await response.json();
        setData(payload.data || null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch student attendance.";
        console.error(message);
        toast({
          title: "Could not load report",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAttendance();
  }, [batchId, studentId, toast]);

  const attendanceMap = useMemo(() => {
    const map: Record<string, "Present" | "Absent"> = {};
    data?.attendanceRecords.forEach((record) => {
      map[record.date] = record.status;
    });
    return map;
  }, [data]);

  const presentCount = useMemo(
    () => data?.attendanceRecords.filter((record) => record.status === "Present").length ?? 0,
    [data]
  );

  const absentCount = useMemo(
    () => data?.attendanceRecords.filter((record) => record.status === "Absent").length ?? 0,
    [data]
  );

  const attendancePercentage = useMemo(() => {
    const total = presentCount + absentCount;
    return total > 0 ? Math.round((presentCount / total) * 100) : 0;
  }, [presentCount, absentCount]);

  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  const handleChangeMonth = (offset: number) => {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  if (!studentId || !batchId) {
    return <div className="p-4">Missing student or batch selection.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading student attendance preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Student Attendance</p>
          <h1 className="text-3xl font-semibold tracking-tight">{data?.studentName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.studentEmail}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={() => router.push(`/teacher/attendance-report/${batchId}`)}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Batch Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-[28px] border border-border bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Batch & Course</h2>
              <p className="mt-2 text-sm text-muted-foreground">Student attendance details for the selected batch.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Batch</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">{data?.batchName}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Course</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">{data?.courseName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-border bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-emerald-50 p-4 text-center min-h-[110px]">
                <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground whitespace-normal break-words">Present</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-700">{presentCount}</p>
              </div>
              <div className="rounded-3xl bg-rose-50 p-4 text-center min-h-[110px]">
                <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground whitespace-normal break-words">Absent</p>
                <p className="mt-3 text-3xl font-semibold text-rose-700">{absentCount}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4 text-center min-h-[110px]">
                <p className="text-xs uppercase tracking-[0.06em] text-muted-foreground whitespace-normal break-words">Percentage</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">{attendancePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Monthly Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleChangeMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm font-semibold text-slate-900">{formatMonthLabel(monthDate)}</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleChangeMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-700">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-rose-500" /> Absent
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-slate-400" /> No attendance
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => (
              <div key={day} className="py-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth.getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="h-16 rounded-3xl bg-slate-100" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const key = formatDateKey(
                monthDate.getFullYear(),
                monthDate.getMonth() + 1,
                day,
              );
              const status = attendanceMap[key];
              const statusClasses =
                status === "Present"
                  ? "bg-emerald-500 text-white"
                  : status === "Absent"
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-600";

              return (
                <div key={key} className={`flex h-16 flex-col justify-between rounded-3xl border border-slate-200 p-3 text-left ${statusClasses}`}>
                  <span className="text-sm font-semibold">{index + 1}</span>
                  <span className="text-[10px] tracking-[0.18em] uppercase">{status ?? "No data"}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
