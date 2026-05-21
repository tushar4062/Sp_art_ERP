"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Search,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseJsonResponse } from "@/lib/api/parseJsonResponse";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import type { SerializedBatch, SerializedBatchStudent } from "@/lib/batch/types";

type AttendanceStatus = "Present" | "Absent";

type MyAttendanceData = {
  teacher: { id: string; fullName: string; email: string };
  batch: { id: string; batchName: string; courseName: string; batchTiming: string };
  attendanceDate: string;
  isToday: boolean;
  alreadyMarked: boolean;
  record: { status: AttendanceStatus; remarks: string } | null;
};

function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600">
        Not marked
      </span>
    );
  }
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
      }`}
    >
      {status}
    </span>
  );
}

const PAGE_SIZE = 10;

export function TeacherBatchDetailPage({ batchId }: { batchId: string }) {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [batch, setBatch] = useState<SerializedBatch | null>(null);
  const [myAttendance, setMyAttendance] = useState<MyAttendanceData | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>(null);
  const [remarks, setRemarks] = useState("");

  const [search, setSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  const loadBatch = useCallback(async () => {
    setLoadingBatch(true);
    try {
      const res = await fetch(`/api/teacher/batches/${batchId}`, { credentials: "include" });
      const json = await parseJsonResponse<{ error?: string; data?: { batch: SerializedBatch } }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load batch");
      setBatch(json.data?.batch ?? null);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load batch"));
      router.push("/teacher/batches");
    } finally {
      setLoadingBatch(false);
    }
  }, [batchId, router]);

  const loadMyAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/teacher/batches/${batchId}/my-attendance?date=${today}`, {
        credentials: "include",
      });
      const json = await parseJsonResponse<{ error?: string; data?: MyAttendanceData }>(res);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load attendance");
      const data = json.data!;
      setMyAttendance(data);
      if (data.record) {
        setSelectedStatus(data.record.status);
        setRemarks(data.record.remarks);
      } else {
        setSelectedStatus(null);
        setRemarks("");
      }
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load your attendance"));
    } finally {
      setLoadingAttendance(false);
    }
  }, [batchId, today, router]);

  useEffect(() => {
    void loadBatch();
    void loadMyAttendance();
  }, [loadBatch, loadMyAttendance]);

  const alreadyMarked = myAttendance?.alreadyMarked ?? false;
  const locked = alreadyMarked;

  const saveMyAttendance = async () => {
    if (!selectedStatus) {
      toast.error("Select Present or Absent");
      return;
    }
    if (alreadyMarked) {
      toast.error("Attendance already marked for today");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/batches/${batchId}/my-attendance`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus, remarks }),
      });
      const json = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (res.status === 409) {
        toast.error(json.error || "Attendance already marked for today");
        void loadMyAttendance();
        return;
      }
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success(json.message || "Attendance saved");
      void loadMyAttendance();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to save attendance"));
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!batch?.students) return [];
    const q = search.trim().toLowerCase();
    if (!q) return batch.students;
    return batch.students.filter(
      s =>
        s.studentName.toLowerCase().includes(q) ||
        (s.studentEmail || "").toLowerCase().includes(q),
    );
  }, [batch?.students, search]);

  const studentTotalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pagedStudents = filteredStudents.slice(
    (studentPage - 1) * PAGE_SIZE,
    studentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setStudentPage(1);
  }, [search]);

  if (loadingBatch && !batch) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-56 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!batch) return null;

  const timing = batch.batchTiming || `${batch.batchDay} · ${batch.batchTime}`;
  const displayStatus = locked ? myAttendance?.record?.status ?? null : selectedStatus;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0" asChild>
          <Link href="/teacher/batches">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader title={batch.batchName} subtitle={`${batch.courseName} · ${timing}`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Course</p>
          <p className="font-semibold mt-1 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {batch.courseName}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Timing</p>
          <p className="font-semibold mt-1 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {timing}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Students</p>
          <p className="font-semibold mt-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {batch.totalStudents}
          </p>
        </div>
      </div>

      {/* Teacher Attendance Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Teacher attendance
          </h2>
          <StatusBadge status={displayStatus} />
        </div>

        {loadingAttendance ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Teacher
                </dt>
                <dd className="font-semibold mt-1">{myAttendance?.teacher.fullName ?? "—"}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-muted-foreground">Batch</dt>
                <dd className="font-semibold mt-1">{batch.batchName}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date
                </dt>
                <dd className="font-semibold mt-1">{today}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={displayStatus} />
                </dd>
              </div>
            </dl>

            {locked ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Attendance already marked for today.
                {myAttendance?.record?.remarks ? (
                  <p className="mt-2 text-amber-800">
                    <span className="font-medium">Remarks: </span>
                    {myAttendance.record.remarks}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    size="lg"
                    disabled={locked}
                    variant={selectedStatus === "Present" ? "default" : "outline"}
                    className={`rounded-xl min-w-[120px] ${
                      selectedStatus === "Present" ? "bg-emerald-600 hover:bg-emerald-700" : ""
                    }`}
                    onClick={() => setSelectedStatus("Present")}
                  >
                    Present
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    disabled={locked}
                    variant={selectedStatus === "Absent" ? "default" : "outline"}
                    className={`rounded-xl min-w-[120px] ${
                      selectedStatus === "Absent" ? "bg-red-600 hover:bg-red-700" : ""
                    }`}
                    onClick={() => setSelectedStatus("Absent")}
                  >
                    Absent
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Remarks</label>
                  <Textarea
                    className="rounded-xl mt-2 min-h-[88px]"
                    placeholder="Late arrival, substitute class, sick leave…"
                    value={remarks}
                    disabled={locked}
                    onChange={e => setRemarks(e.target.value)}
                  />
                </div>

                <Button
                  className="rounded-xl gradient-primary text-white border-0 w-full sm:w-auto"
                  disabled={saving || locked || !selectedStatus}
                  onClick={() => void saveMyAttendance()}
                >
                  {saving ? "Saving…" : "Save attendance"}
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {/* Students roster (view only) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-display font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Batch students ({batch.totalStudents})
        </h2>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10 rounded-2xl"
            placeholder="Search student name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No students in this batch.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedStudents.map((s: SerializedBatchStudent) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.studentName}</TableCell>
                      <TableCell className="text-muted-foreground">{s.studentEmail || "—"}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {studentTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-sm text-muted-foreground">
                  Page {studentPage} of {studentTotalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={studentPage <= 1}
                    onClick={() => setStudentPage(p => p - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={studentPage >= studentTotalPages}
                    onClick={() => setStudentPage(p => p + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
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
