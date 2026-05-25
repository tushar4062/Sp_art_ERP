"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { batchFetch } from "@/lib/batch/batchFetch";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { exportStaffAttendancePdf } from "@/lib/attendance/exportStaffAttendancePdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReportRow = {
  id: string;
  userId: string;
  batchId: string;
  staffName: string;
  batchName: string;
  remarks: string;
};

type Summary = {
  total: number;
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
  const [batchId, setBatchId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<ReportRow[]>([]);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ id: string; batchName: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const listPath =
    role === "senior-teacher" ? "/admin/attendance/senior-teacher" : "/admin/attendance/teacher";

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
  }, [role, batchId, userId, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const clearFilters = () => {
    setBatchId("all");
    setUserId("all");
    setSearch("");
    setPage(1);
  };

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
        attendanceStatus: "—",
        attendanceDate: "—",
        remarks: r.remarks,
      })),
      `${role}-attendance-report.pdf`,
    );
    toast.success("PDF downloaded");
  };

  const previewHref = (row: ReportRow) => {
    const q = new URLSearchParams({ role, returnTo: listPath });
    return `/admin/attendance/report/${encodeURIComponent(row.id)}?${q}`;
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={title}
        subtitle={`Filter and preview ${staffColumnLabel.toLowerCase()} attendance by batch`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              asChild
            >
              <Link href={backHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-xl gradient-primary text-white border-0"
              onClick={exportPdf}
              disabled={!records.length || loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      <Card className="rounded-3xl border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-muted/25 pb-4">
          <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{staffColumnLabel}</Label>
              <Select value={userId} onValueChange={v => { setUserId(v); setPage(1); }}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder={`All ${staffColumnLabel}s`} />
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Batch</Label>
              <Select value={batchId} onValueChange={v => { setBatchId(v); setPage(1); }}>
                <SelectTrigger className="h-10 rounded-xl">
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
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs font-medium text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  className="h-10 rounded-xl pl-9 transition-all focus-visible:ring-primary/25"
                  placeholder="Search by teacher, batch, or remarks"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      setPage(1);
                      void load();
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" className="rounded-xl h-9" onClick={() => { setPage(1); void load(); }} disabled={loading}>
              Apply filters
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl h-9" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
          <CardTitle className="text-base font-display font-semibold">Attendance list</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/80">
                <TableHead className="font-semibold">{staffColumnLabel}</TableHead>
                <TableHead className="font-semibold">Batch</TableHead>
                <TableHead className="font-semibold">Remarks</TableHead>
                <TableHead className="font-semibold text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </TableCell>
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-16 text-center">
                    <p className="font-medium text-foreground">No attendance data available</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Adjust filters or check back after staff mark attendance.
                    </p>
                    <Button variant="outline" className="mt-4 rounded-xl" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((row, i) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "border-border/60 transition-colors hover:bg-primary/5",
                      i % 2 === 1 && "bg-muted/25",
                    )}
                  >
                    <TableCell className="font-medium">{row.staffName}</TableCell>
                    <TableCell>{row.batchName}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground" title={row.remarks}>
                      {row.remarks || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="rounded-xl h-8" asChild>
                        <Link href={previewHref(row)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {summary && summary.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {summary.page} of {summary.totalPages} · {summary.total} entries
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                disabled={page >= summary.totalPages || loading}
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
