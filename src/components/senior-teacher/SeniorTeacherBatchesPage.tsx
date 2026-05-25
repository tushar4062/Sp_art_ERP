"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { BatchesWithAttendancePage } from "@/components/batches/BatchesWithAttendancePage";
import type { BatchRow } from "@/components/batches/batchAttendanceShared";
import { Button } from "@/components/ui/button";
import { useBatchRoutes } from "@/lib/batch/useBatchRoutes";
import { useState } from "react";
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
import { batchFetch } from "@/lib/batch/batchFetch";
import { toast } from "sonner";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

export function SeniorTeacherBatchesPage() {
  const routes = useBatchRoutes();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await batchFetch(`/api/senior-teacher/batches/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Batch deleted");
      setDeleteId(null);
      setReloadKey(k => k + 1);
    } catch (e) {
      toast.error(messageFromUnknown(e, "Delete failed"));
    } finally {
      setDeleting(false);
    }
  };

  const rowActions = (batch: BatchRow) => (
    <>
      <Button variant="secondary" size="sm" className="rounded-lg h-8 px-2.5 shrink-0" asChild>
        <Link href={routes.edit(batch.id)}>
          <Pencil className="w-3.5 h-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Edit</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg h-8 px-2.5 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => setDeleteId(batch.id)}
      >
        <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </>
  );

  return (
    <>
      <BatchesWithAttendancePage
        key={reloadKey}
        portal="senior-teacher"
        headerAction={
          <Button asChild className="rounded-xl gradient-primary text-white border-0 shadow-md">
            <Link href={routes.new}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Batch
            </Link>
          </Button>
        }
        renderRowActions={rowActions}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the batch and its roster. Teachers are not deleted.
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
    </>
  );
}
