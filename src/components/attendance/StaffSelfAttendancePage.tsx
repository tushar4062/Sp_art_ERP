"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardCheck, Loader2, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { todayDateString } from "@/lib/leave/dateValidation";

type BatchOption = {
  id: string;
  batchName: string;
  courseName: string;
  batchTiming: string;
  totalStudents: number;
};

type AttendanceRecord = {
  id: string;
  attendanceStatus: string;
  remarks: string;
  attendanceDate: string;
  batchName?: string;
};

type HistoryRow = {
  id: string;
  batchName: string;
  attendanceStatus: string;
  attendanceDate: string;
  remarks: string;
  createdAt: string;
};

type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  attendancePercentage: number;
};

export type StaffSelfAttendanceConfig = {
  apiPath: string;
  roleLabel: string;
  title: string;
  subtitle: string;
  batchesHref?: string;
  studentAttendanceHref?: string;
};

const STATUS_OPTIONS = ["Present", "Absent", "Half Day"] as const;

function statusPillClass(status: string) {
  if (status === "Present") return "bg-success-soft text-success";
  if (status === "Half Day") return "bg-warning-soft text-warning";
  if (status === "Absent") return "bg-destructive-soft text-destructive";
  return "bg-muted text-muted-foreground";
}

function formatDisplayDate(iso: string) {
  try {
    return format(parseISO(iso), "EEEE, d MMMM yyyy");
  } catch {
    return iso;
  }
}

export function StaffSelfAttendancePage({
  apiPath,
  roleLabel,
  title,
  subtitle,
  batchesHref,
  studentAttendanceHref,
}: StaffSelfAttendanceConfig) {
  const today = todayDateString();
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Present");
  const [remarks, setRemarks] = useState("");
  const [existing, setExisting] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  const loadBatches = useCallback(async () => {
    const res = await fetch(apiPath, { credentials: "include" });
    const json = await parseJsonResponse<{
      success?: boolean;
      error?: string;
      data?: { batches: BatchOption[] };
    }>(res);
    if (!res.ok) throw new Error(json.error || "Failed to load batches");
    const list = json.data?.batches ?? [];
    setBatches(list);
    setBatchId(prev => prev || list[0]?.id || "");
  }, [apiPath]);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`${apiPath}?history=1&limit=30`, { credentials: "include" });
    const json = await parseJsonResponse<{
      error?: string;
      data?: { history: HistoryRow[]; stats: AttendanceStats };
    }>(res);
    if (!res.ok) return;
    setHistory(json.data?.history ?? []);
    setStats(json.data?.stats ?? null);
  }, [apiPath]);

  const loadRecord = useCallback(async () => {
    if (!batchId) return;
    setLoadingRecord(true);
    try {
      const params = new URLSearchParams({ batchId, date: today });
      const res = await fetch(`${apiPath}?${params}`, { credentials: "include" });
      const json = await parseJsonResponse<{
        error?: string;
        data?: { record: AttendanceRecord | null };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load record");
      const rec = json.data?.record ?? null;
      setExisting(rec);
      if (rec) {
        setStatus(rec.attendanceStatus as (typeof STATUS_OPTIONS)[number]);
        setRemarks(rec.remarks ?? "");
      } else {
        setStatus("Present");
        setRemarks("");
      }
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load attendance"));
    } finally {
      setLoadingRecord(false);
    }
  }, [apiPath, batchId, today]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadBatches(), loadHistory()]);
      } catch (e) {
        toast.error(messageFromUnknown(e, "Failed to load attendance"));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBatches, loadHistory]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleSubmit = async () => {
    if (submitLockRef.current || submitting) return;
    if (!batchId) {
      toast.error("Please select a batch");
      return;
    }
    if (existing) {
      toast.error("Attendance already marked for today");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, attendanceDate: today, status, remarks }),
      });
      const json = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (res.status === 409) {
        toast.error(json.error || "Attendance already marked for today");
        await loadRecord();
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to save attendance");
      toast.success(json.message || "Attendance saved for today");
      await Promise.all([loadRecord(), loadHistory()]);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to save attendance"));
    } finally {
      setSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const selectedBatch = batches.find(b => b.id === batchId);
  const markedTodayCount = batches.length
    ? history.filter(h => h.attendanceDate === today).length
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap gap-2">
            {batchesHref ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={batchesHref}>Mark from batches table</Link>
              </Button>
            ) : null}
            {studentAttendanceHref ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={studentAttendanceHref}>
                  <Users className="mr-2 h-4 w-4" />
                  Student attendance
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-transparent">
        <CardContent className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today&apos;s date</p>
              <p className="text-lg font-semibold">{formatDisplayDate(today)}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Day-wise attendance: one entry per batch per day. Past and future dates are not allowed.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card className="rounded-3xl border border-border">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No batches assigned to your {roleLabel} account.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Assigned batches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{batches.length}</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Selected batch</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold truncate">{selectedBatch?.batchName ?? "—"}</p>
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s status</CardTitle>
              </CardHeader>
              <CardContent>
                {existing ? (
                  <StatusPill status={existing.attendanceStatus} className={statusPillClass(existing.attendanceStatus)} />
                ) : (
                  <p className="text-sm text-muted-foreground">Not marked yet</p>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-3xl border border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance %</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{stats?.attendancePercentage ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.total ?? 0} total records</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Mark today&apos;s attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Assigned batch</Label>
                  <Select value={batchId} onValueChange={setBatchId} disabled={!!existing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {batches.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.batchName} · {b.courseName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Attendance date</Label>
                  <p className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium">
                    {today} <span className="text-muted-foreground">(today only)</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={v => setStatus(v as (typeof STATUS_OPTIONS)[number])}
                    disabled={!!existing || loadingRecord}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    placeholder="Optional notes"
                    rows={3}
                    disabled={!!existing || loadingRecord}
                  />
                </div>
              </div>

              {loadingRecord ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking today&apos;s record…
                </div>
              ) : existing ? (
                <p className="text-sm font-medium text-amber-800 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                  Attendance already marked for today
                  {selectedBatch ? ` — ${selectedBatch.batchName}` : ""}.
                </p>
              ) : null}

              <Button
                onClick={handleSubmit}
                disabled={submitting || !!existing || loadingRecord || !batchId}
                className="rounded-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit attendance"
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Attendance history</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recent day-wise records across your batches ({markedTodayCount} marked today in history view)
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No attendance history yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>{row.attendanceDate}</TableCell>
                          <TableCell className="font-medium">{row.batchName}</TableCell>
                          <TableCell>
                            <StatusPill status={row.attendanceStatus} className={statusPillClass(row.attendanceStatus)} />
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{row.remarks || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
