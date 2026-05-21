"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Calendar, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

type Summary = { present: number; absent: number; percent: number; sessions: number; total: number };
type BatchRow = {
  id: string;
  batchName: string;
  courseName: string;
  batchTiming: string;
  totalStudents: number;
  attendanceSummary: { averageAttendancePercent: number; totalSessions: number };
};
type DailyRow = { date: string; present: number; absent: number };
type TeacherRecord = {
  id: string;
  attendanceDate: string;
  status: string;
  remarks: string;
  teacherName: string;
  batchName: string;
};

export function AttendanceReportsPage({
  title,
  subtitle,
  portal,
}: {
  title: string;
  subtitle: string;
  /** Which session cookie the API should use */
  portal: "senior" | "admin";
}) {
  const reportsUrl =
    portal === "admin" ? "/api/admin/attendance/reports" : "/api/senior-teacher/attendance/reports";
  const batchesUrl =
    portal === "admin"
      ? "/api/senior-teacher/batches?page=1&limit=200"
      : "/api/senior-teacher/batches?page=1&limit=200";
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchId, setBatchId] = useState("all");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; batchName: string }[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [teacherRecords, setTeacherRecords] = useState<TeacherRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res =
          portal === "admin"
            ? await batchFetch(batchesUrl)
            : await fetch(batchesUrl, { credentials: "include" });
        const json = await parseJsonResponse<{
          data?: { batches: { id: string; batchName: string }[] };
        }>(res);
        if (res.ok && json.data?.batches) {
          setBatchOptions(json.data.batches.map(b => ({ id: b.id, batchName: b.batchName })));
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, type: "teacher" });
      if (batchId && batchId !== "all") params.set("batchId", batchId);
      const res =
        portal === "admin"
          ? await batchFetch(`${reportsUrl}?${params}`)
          : await fetch(`${reportsUrl}?${params}`, { credentials: "include" });
      const json = await parseJsonResponse<{
        error?: string;
        data?: { summary: Summary; batches: BatchRow[]; daily: DailyRow[]; teacherRecords?: TeacherRecord[] };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load reports");
      setSummary(json.data?.summary ?? null);
      setBatches(json.data?.batches ?? []);
      setDaily(json.data?.daily ?? []);
      setTeacherRecords(json.data?.teacherRecords ?? []);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load attendance reports"));
    } finally {
      setLoading(false);
    }
  }, [from, to, batchId, portal, reportsUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" className="rounded-xl mt-1" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" className="rounded-xl mt-1" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Batch</label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger className="rounded-xl mt-1">
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {batchOptions.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" className="rounded-xl mt-3" onClick={() => void load()}>
          Apply filters
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Present
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-700">{summary.present}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" /> Absent
              </p>
              <p className="text-2xl font-bold mt-1 text-red-700">{summary.absent}</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Attendance %
              </p>
              <p className="text-2xl font-bold mt-1">{summary.percent}%</p>
            </div>
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Sessions
              </p>
              <p className="text-2xl font-bold mt-1">{summary.sessions}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              Daily teacher attendance
            </h2>
            {daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No attendance records in this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daily.map(d => (
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell className="text-emerald-700 font-medium">{d.present}</TableCell>
                      <TableCell className="text-red-700 font-medium">{d.absent}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="font-display font-semibold mb-4">Teacher attendance log</h2>
            {teacherRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No teacher attendance marked in this period.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherRecords.slice(0, 50).map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.attendanceDate}</TableCell>
                      <TableCell className="font-medium">{r.teacherName}</TableCell>
                      <TableCell>{r.batchName}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            r.status === "Present"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {r.remarks || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
            <h2 className="font-display font-semibold mb-4">Batch-wise report</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Avg. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.batchName}</TableCell>
                    <TableCell>{b.courseName}</TableCell>
                    <TableCell>{b.totalStudents}</TableCell>
                    <TableCell>{b.attendanceSummary.totalSessions}</TableCell>
                    <TableCell>{b.attendanceSummary.averageAttendancePercent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  );
}
