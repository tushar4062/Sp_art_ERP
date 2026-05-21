"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Download, Users, Calendar, MapPin, BookOpen, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SerializedBatch } from "@/lib/batch/types";
import { openBatchPrintExport } from "@/lib/batch/printBatchExport";
import { batchFetch } from "@/lib/batch/batchFetch";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import { canManageBatches } from "@/lib/batch/permissions";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

export function BatchDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const routes = useBatchRoutes();
  const canWrite = canManageBatches(user?.role);
  const [batch, setBatch] = useState<SerializedBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await batchFetch(`/api/senior-teacher/batches/${id}`);
        const json = await res.json();
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error(json.error || "Not found");
        setBatch(json.data.batch);
      } catch (e) {
        toast.error(messageFromUnknown(e, "Failed to load batch"));
        router.push(routes.list);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading || !batch) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  const timing = `${batch.batchDay} · ${batch.batchTime}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl shrink-0" asChild>
          <Link href={routes.list}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <PageHeader
          title={batch.batchName}
          subtitle={`${batch.courseName} · ${timing}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                type="button"
                onClick={() => {
                  if (!openBatchPrintExport(batch)) toast.error("Allow pop-ups to export");
                  else toast.message("Choose “Save as PDF” in the print dialog");
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              {canWrite && (
                <Button asChild className="rounded-xl gradient-primary text-white border-0">
                  <Link href={routes.edit(batch.id)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Batch information
          </h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Course</dt>
              <dd className="font-medium text-right">{batch.courseName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Schedule</dt>
              <dd className="font-medium text-right">{timing}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Run period
              </dt>
              <dd className="font-medium text-right">
                {batch.startMonth} → {batch.endMonth}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Branch
              </dt>
              <dd className="font-medium text-right">{batch.branch}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Capacity</dt>
              <dd className="font-medium text-right">{batch.batchCapacity}</dd>
            </div>
          </dl>
          {batch.description ? (
            <p className="text-sm text-slate-600 border-t border-slate-100 pt-3">{batch.description}</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-display font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Attendance summary
          </h2>
          <p className="text-sm text-muted-foreground">
            Placeholder metrics for reporting — connect to your attendance module when ready.
          </p>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total sessions</dt>
              <dd className="font-medium">{batch.attendanceSummary.totalSessions}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Completed</dt>
              <dd className="font-medium">{batch.attendanceSummary.completedSessions}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Avg. attendance</dt>
              <dd className="font-medium">{batch.attendanceSummary.averageAttendancePercent}%</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          Teachers ({(batch.teachers || []).length})
        </h2>
        <ul className="divide-y divide-slate-100">
          {(batch.teachers || []).length === 0 ? (
            <li className="py-3 text-sm text-muted-foreground">No teachers assigned.</li>
          ) : (
            (batch.teachers || []).map(t => (
              <li key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                <span className="font-medium">{t.fullName}</span>
                <span className="text-muted-foreground">{t.email}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-x-auto">
        <h2 className="font-display font-semibold flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          Students ({batch.totalStudents})
        </h2>
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-muted-foreground">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Name</th>
              <th className="pb-2 pr-2">Email</th>
              <th className="pb-2 pr-2">Phone</th>
              <th className="pb-2">Course</th>
            </tr>
          </thead>
          <tbody>
            {batch.students.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-50">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">{s.studentName}</td>
                <td className="py-2 pr-2 text-muted-foreground">{s.studentEmail || "—"}</td>
                <td className="py-2 pr-2">{s.phone || "—"}</td>
                <td className="py-2">{s.course || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
