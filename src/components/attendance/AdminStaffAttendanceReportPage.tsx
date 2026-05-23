"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search, BarChart3, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusPill } from "@/components/shared/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { exportStaffAttendancePdf } from "@/lib/attendance/exportStaffAttendancePdf";
import { toast } from "sonner";

type ReportRow = {
  id: string;
  staffName: string;
  batchName: string;
  attendanceStatus: string;
  attendanceDate: string;
  remarks: string;
};

type Summary = {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  attendancePercentage?: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function AdminStaffAttendanceReportPage({
  role,
  title,
  staffColumnLabel,
  backHref = "/admin/attendance",
}: {
  role: "teacher" | "senior-teacher";
  title: string;
  staffColumnLabel: string;
  backHref?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [batchId, setBatchId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<ReportRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; batchName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await batchFetch(`/api/admin/staff-attendance/filters?role=${role}`);
        const json = await parseJsonResponse<{
          data?: {
            staff: { id: string; name: string }[];
            batches: { id: string; batchName: string }[];
          };
        }>(res);
        if (res.ok && json.data) {
          setStaffOptions(json.data.staff ?? []);
          setBatchOptions(json.data.batches ?? []);
        }
      } catch {
        /* optional */
      }
    })();
  }, [role]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        role,
        page: String(page),
        limit: "20",
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (batchId !== "all") params.set("batchId", batchId);
      if (userId !== "all") params.set("userId", userId);
      if (search.trim()) params.set("search", search.trim());

      const res = await batchFetch(`/api/admin/staff-attendance/reports?${params}`);
      const json = await parseJsonResponse<{
        error?: string;
        data?: { summary: Summary; records: ReportRow[] };
      }>(res);
      if (!res.ok) throw new Error(json.error || "Failed to load report");
      setSummary(json.data?.summary ?? null);
      setRecords(json.data?.records ?? []);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load attendance report"));
    } finally {
      setLoading(false);
    }
  }, [role, from, to, batchId, userId, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportPdf = () => {
    if (!records.length) {
      toast.error("No records to export");
      return;
    }
    exportStaffAttendancePdf(
      title,
      records.map(r => ({
        staffName: r.staffName,
        batchName: r.batchName,
        attendanceStatus: r.attendanceStatus,
        attendanceDate: r.attendanceDate,
        remarks: r.remarks,
      })),
      `${role}-attendance-report.pdf`,
    );
    toast.success("PDF downloaded");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle="Filter, search, and export staff attendance records"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf} disabled={!records.length}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total records", value: summary?.total ?? 0, icon: BarChart3 },
          { label: "Present", value: summary?.present ?? 0, icon: CheckCircle2 },
          { label: "Absent", value: summary?.absent ?? 0, icon: XCircle },
          { label: "Half day", value: summary?.halfDay ?? 0, icon: Clock },
          {
            label: "Attendance %",
            value: summary?.attendancePercentage != null ? `${summary.attendancePercentage}%` : "—",
            icon: BarChart3,
          },
        ].map(item => (
          <Card key={item.label} className="rounded-3xl border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{item.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border border-border">
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} placeholder="To" />
            <Select value={userId} onValueChange={v => { setUserId(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder={staffColumnLabel} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {staffColumnLabel}s</SelectItem>
                {staffOptions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchId} onValueChange={v => { setBatchId(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Batch" />
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
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search name, batch, remarks…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (setPage(1), load())}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { setPage(1); load(); }}>
              Apply filters
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFrom("");
                setTo("");
                setBatchId("all");
                setUserId("all");
                setSearch("");
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{staffColumnLabel}</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              ) : (
                records.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.staffName}</TableCell>
                    <TableCell>{row.batchName}</TableCell>
                    <TableCell>
                      <StatusPill status={row.attendanceStatus} />
                    </TableCell>
                    <TableCell>{row.attendanceDate}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{row.remarks || "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {summary && summary.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {summary.page} of {summary.totalPages}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= summary.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
