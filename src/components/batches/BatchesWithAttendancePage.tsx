"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Search, Clock, Users, BookOpen, Boxes } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { batchFetch } from "@/lib/batch/batchFetch";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import {
  EMPTY_TODAY_ATTENDANCE,
  normalizeBatchRow,
  type AttendanceStatus,
  type BatchRow,
} from "@/components/batches/batchAttendanceShared";

export type BatchesPortal = "teacher" | "senior-teacher";

const PORTAL_DEFAULTS: Record<
  BatchesPortal,
  {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    listApiPath: string;
    useBatchFetch: boolean;
    showHalfDay: boolean;
    /** Load all batches on one page (no pagination). */
    pageSize: number;
  }
> = {
  teacher: {
    title: "My Batches",
    emptyTitle: "No batches assigned yet",
    emptyDescription: "When a senior teacher assigns you to a batch, it will appear here automatically.",
    listApiPath: "/api/teacher/batches",
    useBatchFetch: false,
    showHalfDay: false,
    pageSize: 200,
  },
  "senior-teacher": {
    title: "My Batches",
    emptyTitle: "No batches yet",
    emptyDescription: "Create a batch or batches in your scope will appear here for attendance.",
    listApiPath: "/api/senior-teacher/batches",
    useBatchFetch: false,
    showHalfDay: true,
    pageSize: 200,
  },
};

function myAttendancePath(portal: BatchesPortal, batchId: string) {
  return portal === "teacher"
    ? `/api/teacher/batches/${batchId}/my-attendance`
    : `/api/senior-teacher/batches/${batchId}/my-attendance`;
}

function batchViewPathForPortal(portal: BatchesPortal, batchId: string, seniorDetail: (id: string) => string) {
  return portal === "teacher" ? `/teacher/batches/${batchId}` : seniorDetail(batchId);
}

type Pagination = { page: number; limit: number; total: number; totalPages: number };
type RowDraft = { status: AttendanceStatus | null; remarks: string };

export type BatchesWithAttendanceConfig = {
  portal: BatchesPortal;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  headerAction?: ReactNode;
  renderRowActions?: (batch: BatchRow) => ReactNode;
};

function BatchStatusBadge({ status }: { status: string }) {
  const styles =
    status === "Active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Completed"
        ? "bg-blue-100 text-blue-700"
        : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status}</span>
  );
}

function AttendanceStatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) return null;
  const styles =
    status === "Present"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Half Day"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${styles}`}>{status}</span>
  );
}

function BatchAttendanceControls({
  batch,
  draft,
  saving,
  showHalfDay,
  onDraftChange,
  onSave,
}: {
  batch: BatchRow;
  draft: RowDraft;
  saving: boolean;
  showHalfDay?: boolean;
  onDraftChange: (d: RowDraft) => void;
  onSave: () => void;
}) {
  const today = batch.todayAttendance ?? EMPTY_TODAY_ATTENDANCE;
  const locked = today.alreadyMarked;
  const displayStatus = locked ? today.status : draft.status;

  if (locked) {
    return (
      <div className="flex flex-col gap-1 min-w-[160px]">
        <div className="flex items-center gap-2 flex-nowrap">
          <AttendanceStatusBadge status={displayStatus} />
          <span className="text-xs text-amber-700 whitespace-nowrap">Marked for today</span>
        </div>
        {today.remarks ? (
          <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={today.remarks}>
            {today.remarks}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant={draft.status === "Present" ? "default" : "outline"}
          className={`rounded-lg h-8 text-xs ${draft.status === "Present" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
          disabled={saving}
          onClick={() => onDraftChange({ ...draft, status: "Present" })}
        >
          Present
        </Button>
        <Button
          type="button"
          size="sm"
          variant={draft.status === "Absent" ? "default" : "outline"}
          className={`rounded-lg h-8 text-xs ${draft.status === "Absent" ? "bg-red-600 hover:bg-red-700" : ""}`}
          disabled={saving}
          onClick={() => onDraftChange({ ...draft, status: "Absent" })}
        >
          Absent
        </Button>
        {showHalfDay ? (
          <Button
            type="button"
            size="sm"
            variant={draft.status === "Half Day" ? "default" : "outline"}
            className={`rounded-lg h-8 text-xs ${draft.status === "Half Day" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
            disabled={saving}
            onClick={() => onDraftChange({ ...draft, status: "Half Day" })}
          >
            Half Day
          </Button>
        ) : null}
        {displayStatus ? <AttendanceStatusBadge status={displayStatus} /> : null}
      </div>
      <Input
        className="rounded-lg h-8 text-xs"
        placeholder="Remark…"
        value={draft.remarks}
        disabled={saving}
        onChange={e => onDraftChange({ ...draft, remarks: e.target.value })}
      />
      <Button
        type="button"
        size="sm"
        className="rounded-lg h-8 text-xs gradient-primary text-white border-0 w-fit"
        disabled={saving || !draft.status}
        onClick={onSave}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export function BatchesWithAttendancePage({
  portal,
  title: titleProp,
  emptyTitle: emptyTitleProp,
  emptyDescription: emptyDescriptionProp,
  headerAction,
  renderRowActions,
}: BatchesWithAttendanceConfig) {
  const defaults = PORTAL_DEFAULTS[portal];
  const title = titleProp ?? defaults.title;
  const emptyTitle = emptyTitleProp ?? defaults.emptyTitle;
  const emptyDescription = emptyDescriptionProp ?? defaults.emptyDescription;
  const listApiPath = defaults.listApiPath;
  const useBatchFetch = defaults.useBatchFetch;
  const showHalfDay = defaults.showHalfDay;
  const pageSize = defaults.pageSize;
  const routes = useBatchRoutes();
  const batchViewPath = (batchId: string) =>
    batchViewPathForPortal(portal, batchId, id => routes.detail(id));

  const router = useRouter();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filterCourse, setFilterCourse] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, filterCourse, filterStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        search: debounced,
        course: filterCourse === "All" ? "" : filterCourse,
        status: filterStatus,
      });
      const url = `${listApiPath}?${params}`;
      const res = useBatchFetch
        ? await batchFetch(url)
        : await fetch(url, { credentials: "include" });
      const json = await parseJsonResponse<{
        error?: string;
        data?: { batches: BatchRow[]; pagination: Pagination; filterOptions?: { courses?: string[] } };
      }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load batches");
      const list = (json.data?.batches ?? []).map(b => normalizeBatchRow(b as BatchRow));
      setBatches(list);
      setPagination(json.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 });
      setCourseOptions(json.data?.filterOptions?.courses ?? []);
      const nextDrafts: Record<string, RowDraft> = {};
      for (const b of list) {
        nextDrafts[b.id] = {
          status: b.todayAttendance.status,
          remarks: b.todayAttendance.remarks,
        };
      }
      setDrafts(nextDrafts);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load batches"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debounced, filterCourse, filterStatus, router, listApiPath, useBatchFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAttendance = async (batchId: string) => {
    const draft = drafts[batchId];
    if (!draft?.status) {
      toast.error("Select an attendance status");
      return;
    }
    const batch = batches.find(b => b.id === batchId);
    if (batch?.todayAttendance?.alreadyMarked) {
      toast.error("Attendance already marked for today");
      return;
    }

    setSavingId(batchId);
    try {
      const attendanceUrl = myAttendancePath(portal, batchId);
      const res = useBatchFetch
        ? await batchFetch(attendanceUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: draft.status, remarks: draft.remarks }),
          })
        : await fetch(attendanceUrl, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: draft.status, remarks: draft.remarks }),
          });
      const json = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (res.status === 409) {
        toast.error(json.error || "Attendance already marked for today");
        void load();
        return;
      }
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(json.message || "Attendance saved");
      void load();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to save attendance"));
    } finally {
      setSavingId(null);
    }
  };

  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={
          loading
            ? "Loading your assigned batches…"
            : `${pagination.total} batch${pagination.total === 1 ? "" : "es"} assigned to you`
        }
        action={headerAction}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 rounded-2xl"
              placeholder="Search batch name, code, course…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All courses</SelectItem>
              {courseOptions.map(c => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="py-16 text-center px-6">
            <Boxes className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-display font-semibold text-lg">{emptyTitle}</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{emptyDescription}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Batch Name</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Course</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Timing</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Students</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Status</TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600 min-w-[240px]">
                      Attendance
                    </TableHead>
                    <TableHead className="px-6 py-4 text-xs font-semibold uppercase text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {batches.map(b => (
                    <TableRow key={b.id} className="border-0 hover:bg-slate-50 align-middle">
                      <TableCell className="px-4 py-3 font-semibold whitespace-nowrap">{b.batchName}</TableCell>
                      <TableCell className="px-4 py-3 max-w-[140px] truncate" title={b.courseName}>
                        {b.courseName}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                        {b.batchTiming || `${b.batchDay} · ${b.batchTime}`}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">{b.totalStudents}</TableCell>
                      <TableCell className="px-4 py-3">
                        <BatchStatusBadge status={b.batchStatus || "Active"} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <BatchAttendanceControls
                          batch={b}
                          draft={drafts[b.id] ?? { status: null, remarks: "" }}
                          saving={savingId === b.id}
                          showHalfDay={showHalfDay}
                          onDraftChange={d => setDrafts(prev => ({ ...prev, [b.id]: d }))}
                          onSave={() => void saveAttendance(b.id)}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-row flex-nowrap items-center justify-end gap-1.5">
                          <Button variant="outline" size="sm" className="rounded-lg h-8 px-2.5 shrink-0" asChild>
                            <Link href={batchViewPath(b.id)}>
                              <Eye className="w-3.5 h-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </Button>
                          {renderRowActions?.(b)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {batches.map(b => (
                <div key={b.id} className="p-4 space-y-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-semibold">{b.batchName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <BookOpen className="w-3.5 h-3.5" /> {b.courseName}
                      </p>
                    </div>
                    <BatchStatusBadge status={b.batchStatus || "Active"} />
                  </div>
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {b.batchTiming || `${b.batchDay} · ${b.batchTime}`}
                  </p>
                  <p className="text-xs flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {b.totalStudents} students
                  </p>
                  <BatchAttendanceControls
                    batch={b}
                    draft={drafts[b.id] ?? { status: null, remarks: "" }}
                    saving={savingId === b.id}
                    showHalfDay={showHalfDay}
                    onDraftChange={d => setDrafts(prev => ({ ...prev, [b.id]: d }))}
                    onSave={() => void saveAttendance(b.id)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg" asChild>
                      <Link href={batchViewPath(b.id)}>
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Link>
                    </Button>
                    {renderRowActions?.(b)}
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && pagination.total > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {pagination.totalPages} · {pagination.total} total
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Button>
                  {pageNumbers.map(n => (
                    <Button
                      key={n}
                      variant={n === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
