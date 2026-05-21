"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Eye, Download, Users, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SerializedBatch } from "@/lib/batch/types";
import { openBatchPrintExport } from "@/lib/batch/printBatchExport";
import { batchFetch } from "@/lib/batch/batchFetch";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import { canManageBatches } from "@/lib/batch/permissions";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

type Pagination = { page: number; limit: number; total: number; totalPages: number };

export function BatchesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const routes = useBatchRoutes();
  const canWrite = canManageBatches(user?.role);

  const [batches, setBatches] = useState<SerializedBatch[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [courseOptions, setCourseOptions] = useState<string[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [course, setCourse] = useState("All");
  const [status, setStatus] = useState("All");
  const [teacherId, setTeacherId] = useState("All");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, course, teacherId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search: debounced,
        course: course === "All" ? "" : course,
        teacherId: teacherId === "All" ? "" : teacherId,
        status,
      });
      const res = await batchFetch(`/api/senior-teacher/batches?${params}`);
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load batches");
      setBatches(json.data.batches);
      setPagination(json.data.pagination);
      setCourseOptions(json.data.filterOptions?.courses ?? []);
      setTeacherOptions(json.data.filterOptions?.teachers ?? []);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Failed to load batches"));
    } finally {
      setLoading(false);
    }
  }, [page, debounced, course, status, teacherId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await batchFetch(`/api/senior-teacher/batches/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (res.status === 403) {
        toast.error(json.error || "You do not have permission to delete batches");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Batch deleted");
      setDeleteId(null);
      void load();
    } catch (e) {
      toast.error(messageFromUnknown(e, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch management"
        subtitle="Create and oversee class batches, roster, and assigned teachers."
        action={
          canWrite ? (
            <Button asChild className="rounded-xl gradient-primary text-white border-0 shadow-md">
              <Link href={routes.new}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Batch
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground max-w-xs text-right">View-only access for this account.</p>
          )
        }
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10 rounded-2xl"
              placeholder="Search by batch name, course, branch…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={course} onValueChange={setCourse}>
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
          <Select value={status} onValueChange={setStatus}>
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
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All teachers</SelectItem>
              {teacherOptions.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium text-foreground">No batches yet</p>
            <p className="text-sm mt-1">
              {canWrite ? "Create your first batch to get started." : "No batches available to view."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {batches.map(b => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-slate-900 leading-tight">{b.batchName}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {b.courseName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        (b.batchStatus || "Active") === "Active"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                          : (b.batchStatus || "") === "Completed"
                            ? "bg-blue-50 text-blue-800 border border-blue-100"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {b.batchStatus || "Active"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 px-2.5 py-1 border border-amber-100">
                      <Clock className="w-3 h-3" />
                      {b.batchTiming || `${b.batchDay} · ${b.batchTime}`}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                      <Users className="w-3 h-3" />
                      {b.totalStudents} students
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">Teachers: </span>
                    {(b.teachers || []).length
                      ? (b.teachers || []).map(t => t.fullName).join(", ")
                      : "None assigned"}
                  </div>
                  <div className="text-xs text-slate-500 mt-auto">
                    {b.startMonth} → {b.endMonth} · {b.branch}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="rounded-lg" asChild>
                      <Link href={routes.detail(b.id)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Link>
                    </Button>
                    {canWrite && (
                      <>
                        <Button variant="secondary" size="sm" className="rounded-lg" asChild>
                          <Link href={routes.edit(b.id)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteId(b.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      type="button"
                      onClick={() => {
                        if (!openBatchPrintExport(b)) toast.error("Allow pop-ups to export");
                        else toast.message("Use “Save as PDF” in the print dialog");
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the batch and its embedded roster from MongoDB. Assigned teachers are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
              disabled={deleting}
              onClick={e => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
